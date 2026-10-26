package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.PublicationAction;
import com.propertypro.property_platform.property.dto.CreatePropertyRequest;
import com.propertypro.property_platform.property.dto.LegalStatusRequest;
import com.propertypro.property_platform.property.dto.PropertyFilter;
import com.propertypro.property_platform.property.dto.PropertyResponse;
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
 * Properties of the mobile app and admin dashboard. The list holds the caller's own properties; every
 * other endpoint works on the caller's own properties, or on any property for holders of the matching
 * {@code PROPERTY_*_ANY} permission (see {@code PropertyAccessService}). Others' properties are 404.
 * <p>
 * Write requests may send {@code If-Match: "<version>"} (from the ETag or {@code version}); a stale
 * version is rejected with 409.
 */
@RestController
@RequestMapping(path = "/api/v1/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Properties", description = "Property CRUD, the 7-step creation wizard and the publication workflow")
@RequiredArgsConstructor
public class PropertyController {

	private final PropertyService propertyService;
	private final PropertyPublicationService publicationService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a draft (wizard step 1)", description = """
			Requires PROPERTY_CREATE, an active verified account and a subscription in force with a free \
			property slot (drafts count), or PROPERTY_CREATE_WITHOUT_SUBSCRIPTION. Send an Idempotency-Key \
			to make retries safe: a repeated key returns the first property with 200.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> create(CurrentActor actor, @Valid @RequestBody CreatePropertyRequest request,
			@RequestHeader(name = IDEMPOTENCY_KEY, required = false) String idempotencyKey) {
		rateLimiter.acquire("property:create:user:" + actor.userId(), limits.propertyCreateUser());
		PropertyService.CreateResult result = propertyService.create(actor, request, idempotencyKey);
		return withEtag(result.created() ? HttpStatus.CREATED : HttpStatus.OK, result.property());
	}

	@Operation(summary = "Create a draft (wizard step 1); same as POST /api/v1/properties")
	@PostMapping(path = "/drafts", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> createDraft(CurrentActor actor,
			@Valid @RequestBody CreatePropertyRequest request,
			@RequestHeader(name = IDEMPOTENCY_KEY, required = false) String idempotencyKey) {
		return create(actor, request, idempotencyKey);
	}

	@Operation(summary = "List my properties", description = """
			Always the caller's own properties (PROPERTY_LIST). page (zero-based), size (max 100), sort by \
			createdAt, updatedAt, projectName, city or publishedAt. ownerId and deleted are admin-only.""")
	@GetMapping
	public PageResponse<PropertySummaryResponse> list(CurrentActor actor, @Valid PropertyFilter filter,
			@SortDefault(sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return propertyService.listOwn(actor, filter, pageable);
	}

	@GetMapping("/{id}")
	public ResponseEntity<PropertyResponse> get(CurrentActor actor, @PathVariable Long id) {
		return withEtag(HttpStatus.OK, propertyService.get(id, actor));
	}

	@Operation(summary = "Update fields of several steps at once", description = """
			Sections details, location, projectInfo and mediaSettings follow the rules of steps 1, 2, 4 and \
			6. An owner's change to an approved or published property returns it to draft.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyRequest request, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return withEtag(HttpStatus.OK, propertyService.update(id, actor, request, expectedVersion(ifMatch)));
	}

	@Operation(summary = "Delete (soft delete)", description = "Frees a property slot; media files are kept.")
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		propertyService.delete(id, actor, expectedVersion(ifMatch));
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Wizard progress", description = "Completion of each step, computed from saved data.")
	@GetMapping("/{id}/wizard")
	public WizardResponse wizard(CurrentActor actor, @PathVariable Long id) {
		return propertyService.wizard(id, actor);
	}

	@Operation(summary = "Step 1: property details")
	@PatchMapping(path = "/{id}/steps/1", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> updateDetails(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyDetailsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return withEtag(HttpStatus.OK, propertyService.updateDetails(id, actor, request, expectedVersion(ifMatch)));
	}

	@Operation(summary = "Step 2: location")
	@PatchMapping(path = "/{id}/steps/2", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> updateLocation(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePropertyLocationRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return withEtag(HttpStatus.OK, propertyService.updateLocation(id, actor, request, expectedVersion(ifMatch)));
	}

	@Operation(summary = "Step 4: project information", description = "legalApprovalStatus cannot be set here.")
	@PatchMapping(path = "/{id}/steps/4", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> updateProjectInfo(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateProjectInfoRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return withEtag(HttpStatus.OK, propertyService.updateProjectInfo(id, actor, request, expectedVersion(ifMatch)));
	}

	@Operation(summary = "Step 6: media settings (3D tour URL)", description = "Media items: /{id}/media.")
	@PatchMapping(path = "/{id}/steps/6", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> updateMediaSettings(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateMediaSettingsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return withEtag(HttpStatus.OK, propertyService.updateMediaSettings(id, actor, request, expectedVersion(ifMatch)));
	}

	@Operation(summary = "Step 7: preview", description = "Everything saved, plus the missing fields of each step.")
	@GetMapping("/{id}/preview")
	public ResponseEntity<PropertyResponse> preview(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("property:preview:user:" + actor.userId(), limits.propertyPreviewUser());
		return withEtag(HttpStatus.OK, propertyService.get(id, actor));
	}

	@Operation(summary = "Step 7: submit for review", description = """
			Requires steps 1-6 complete (422 property_incomplete lists what is missing). Repeating it while \
			pending review changes nothing.""")
	@PostMapping("/{id}/submit")
	public ResponseEntity<PropertyResponse> submit(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.SUBMIT, null, ifMatch);
	}

	@Operation(summary = "Publish an approved property (PROPERTY_PUBLISH)")
	@PostMapping("/{id}/publish")
	public ResponseEntity<PropertyResponse> publish(CurrentActor actor, @PathVariable Long id,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.PUBLISH, null, ifMatch);
	}

	@Operation(summary = "Publication workflow action", description = """
			submit / archive: owner or PROPERTY_UPDATE_ANY; approve / reject: PROPERTY_REVIEW; publish / \
			unpublish: PROPERTY_PUBLISH; suspend / resume: PROPERTY_SUSPEND. reject and suspend need a reason.""")
	@PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> status(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody StatusChangeRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return changeStatus(actor, id, PublicationAction.fromValue(request.action()), request.reason(), ifMatch);
	}

	@Operation(summary = "Legal approval decision (PROPERTY_LEGAL_REVIEW)")
	@PatchMapping(path = "/{id}/legal-status", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> legalStatus(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody LegalStatusRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		return withEtag(HttpStatus.OK, publicationService.changeLegalStatus(id, actor,
				LegalApprovalStatus.fromValue(request.status()), request.reason(), expectedVersion(ifMatch)));
	}

	private ResponseEntity<PropertyResponse> changeStatus(CurrentActor actor, Long id, PublicationAction action,
			String reason, String ifMatch) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		return withEtag(HttpStatus.OK, publicationService.changeStatus(id, actor, action, reason, expectedVersion(ifMatch)));
	}

}
