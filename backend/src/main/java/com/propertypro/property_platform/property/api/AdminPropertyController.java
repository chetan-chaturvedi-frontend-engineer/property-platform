package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.PublicationAction;
import com.propertypro.property_platform.property.dto.CreatePropertyRequest;
import com.propertypro.property_platform.property.dto.LegalStatusRequest;
import com.propertypro.property_platform.property.dto.PropertyFilter;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.dto.PropertyStatsResponse;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse;
import com.propertypro.property_platform.property.dto.StatusChangeRequest;
import com.propertypro.property_platform.property.dto.UpdateMediaSettingsRequest;
import com.propertypro.property_platform.property.dto.UpdateProjectInfoRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyDetailsRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyLocationRequest;
import com.propertypro.property_platform.property.dto.UpdatePropertyRequest;
import com.propertypro.property_platform.property.dto.WizardResponse;
import com.propertypro.property_platform.property.service.PropertyPublicationService;
import com.propertypro.property_platform.property.service.PropertyService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.IDEMPOTENCY_KEY;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.IF_MATCH;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.expectedVersion;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.withEtag;

/**
 * Admin dashboard: every owner's properties. {@code ADMIN_PANEL_ACCESS} is required for the whole path
 * by {@code SecurityConfig}. The dashboard's session cookie is only sent to {@code /api/v1/admin}, so the
 * wizard and workflow endpoints of {@code PropertyController} are mirrored here over the same services:
 * ownership, editability, workflow and subscription rules are identical. Every property response is the
 * admin view (owner details, status history actors, admin media URLs), which needs {@code PROPERTY_VIEW_ANY}.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin properties", description = "All owners' properties, the creation wizard and the publication workflow")
@RequiredArgsConstructor
public class AdminPropertyController {

	private final PropertyService propertyService;
	private final PropertyPublicationService publicationService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List all properties", description = """
			Filters as the owner list plus ownerId and deleted (exclude, only, include). Sort by createdAt, \
			updatedAt, projectName, city or publishedAt. Items add startingPrice, apartmentTypes and coverUrl.""")
	@GetMapping
	@PreAuthorize("hasAuthority('PROPERTY_LIST_ANY')")
	public PageResponse<PropertySummaryResponse> list(@Valid PropertyFilter filter,
			@SortDefault(sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return propertyService.listAll(filter, pageable);
	}

	@Operation(summary = "Counts per publication and legal status", description = """
			Non-deleted properties in total and per status (every status present, 0 when none), plus the \
			number of soft-deleted ones.""")
	@GetMapping("/stats")
	@PreAuthorize("hasAuthority('PROPERTY_LIST_ANY')")
	public PropertyStatsResponse stats() {
		return propertyService.stats();
	}

	@Operation(summary = "Create a draft (wizard step 1) owned by the signed-in admin", description = """
			Same rules as POST /api/v1/properties (PROPERTY_CREATE_WITHOUT_SUBSCRIPTION skips the subscription \
			and limit checks). Send an Idempotency-Key to make retries safe.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_CREATE') and hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> create(CurrentActor actor, @Valid @RequestBody CreatePropertyRequest request,
			@RequestHeader(name = IDEMPOTENCY_KEY, required = false) String idempotencyKey) {
		rateLimiter.acquire("property:create:user:" + actor.userId(), limits.propertyCreateUser());
		PropertyService.CreateResult result = propertyService.create(actor, request, idempotencyKey);
		Long id = result.property().id();
		return withEtag(result.created() ? HttpStatus.CREATED : HttpStatus.OK, propertyService.getAsAdmin(id, actor));
	}

	@Operation(summary = "Property with owner details and status history actors")
	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> get(CurrentActor actor, @PathVariable Long id) {
		return adminView(actor, id);
	}

	@Operation(summary = "Update fields of several steps at once", description = "Sections as PATCH /api/v1/properties/{id}.")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyRequest request, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		propertyService.update(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Delete (soft delete)", description = "Restorable with POST /{id}/restore.")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		propertyService.delete(id, actor, expectedVersion(ifMatch));
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Restore a deleted property", description = """
			The property counts toward its owner's property limit again, so the owner's subscription must have \
			a free slot (403 property_limit_reached otherwise). Its publication status is unchanged.""")
	@PostMapping("/{id}/restore")
	@PreAuthorize("hasAuthority('PROPERTY_RESTORE_ANY')")
	public ResponseEntity<PropertyResponse> restore(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		return withEtag(HttpStatus.OK, propertyService.restore(id, actor));
	}

	@Operation(summary = "Wizard progress", description = "Completion of each step, computed from saved data.")
	@GetMapping("/{id}/wizard")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public WizardResponse wizard(CurrentActor actor, @PathVariable Long id) {
		return propertyService.wizard(id, actor);
	}

	@Operation(summary = "Step 1: property details")
	@PatchMapping(path = "/{id}/steps/1", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> updateDetails(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyDetailsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		propertyService.updateDetails(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 2: location")
	@PatchMapping(path = "/{id}/steps/2", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> updateLocation(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyLocationRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		propertyService.updateLocation(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 4: project information", description = "legalApprovalStatus cannot be set here.")
	@PatchMapping(path = "/{id}/steps/4", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> updateProjectInfo(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateProjectInfoRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		propertyService.updateProjectInfo(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 6: media settings (3D tour URL)", description = "Media items: /{id}/media.")
	@PatchMapping(path = "/{id}/steps/6", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> updateMediaSettings(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateMediaSettingsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		propertyService.updateMediaSettings(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 7: preview", description = "Everything saved, plus the missing fields of each step.")
	@GetMapping("/{id}/preview")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> preview(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("property:preview:user:" + actor.userId(), limits.propertyPreviewUser());
		return adminView(actor, id);
	}

	@Operation(summary = "Step 7: submit for review", description = """
			Requires steps 1-6 complete (422 property_incomplete lists what is missing).""")
	@PostMapping("/{id}/submit")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> submit(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.SUBMIT, null, ifMatch);
	}

	@Operation(summary = "Publish an approved property (PROPERTY_PUBLISH)")
	@PostMapping("/{id}/publish")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY') and hasAuthority('PROPERTY_PUBLISH')")
	public ResponseEntity<PropertyResponse> publish(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.PUBLISH, null, ifMatch);
	}

	@Operation(summary = "Publication workflow action", description = """
			submit / archive: PROPERTY_UPDATE_ANY (or owner); approve / reject: PROPERTY_REVIEW; publish / \
			unpublish: PROPERTY_PUBLISH; suspend / resume: PROPERTY_SUSPEND. reject and suspend need a reason.""")
	@PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> status(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody StatusChangeRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.fromValue(request.action()), request.reason(), ifMatch);
	}

	@Operation(summary = "Legal approval decision (PROPERTY_LEGAL_REVIEW)")
	@PatchMapping(path = "/{id}/legal-status", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY') and hasAuthority('PROPERTY_LEGAL_REVIEW')")
	public ResponseEntity<PropertyResponse> legalStatus(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody LegalStatusRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		publicationService.changeLegalStatus(id, actor, LegalApprovalStatus.fromValue(request.status()),
				request.reason(), expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	private ResponseEntity<PropertyResponse> changeStatus(CurrentActor actor, Long id, PublicationAction action,
			String reason, String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		publicationService.changeStatus(id, actor, action, reason, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	/** The committed property as the admin view; writes run in their own transaction first. */
	private ResponseEntity<PropertyResponse> adminView(CurrentActor actor, Long id) {
		return withEtag(HttpStatus.OK, propertyService.getAsAdmin(id, actor));
	}

}
