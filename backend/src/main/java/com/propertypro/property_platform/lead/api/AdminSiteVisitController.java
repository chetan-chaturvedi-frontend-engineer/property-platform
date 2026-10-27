package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.AdminCreateSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.AssignSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.SiteVisitFilter;
import com.propertypro.property_platform.lead.dto.SiteVisitReportRequest;
import com.propertypro.property_platform.lead.dto.SiteVisitResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitStatusRequest;
import com.propertypro.property_platform.lead.dto.SiteVisitSummaryResponse;
import com.propertypro.property_platform.lead.dto.UpdateSiteVisitRequest;
import com.propertypro.property_platform.lead.service.SiteVisitService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin dashboard: every site visit. {@code ADMIN_PANEL_ACCESS} is required for the whole path by
 * {@code SecurityConfig}; each endpoint also needs its {@code SITE_VISIT_*_ANY} permission.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/site-visits", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin site visits", description = "All site visits")
@RequiredArgsConstructor
public class AdminSiteVisitController {

	private final SiteVisitService siteVisitService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List all site visits (SITE_VISIT_LIST_ANY)", description = """
			page (zero-based), size (max 100), sort by visitDate, createdAt, updatedAt, nextFollowUp or status.""")
	@GetMapping
	@PreAuthorize("hasAuthority('SITE_VISIT_LIST_ANY')")
	public PageResponse<SiteVisitSummaryResponse> list(CurrentActor actor, @Valid SiteVisitFilter filter,
			@SortDefault(sort = "visitDate", direction = Sort.Direction.DESC) Pageable pageable) {
		return siteVisitService.listAll(actor, filter, pageable);
	}

	@Operation(summary = "Create a site visit (SITE_VISIT_CREATE_ANY)", description = """
			The builder comes from the property. assignId also requires SITE_VISIT_ASSIGN_ANY.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('SITE_VISIT_CREATE_ANY')")
	public SiteVisitResponse create(CurrentActor actor, @Valid @RequestBody AdminCreateSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.createAsAdmin(actor, request);
	}

	@Operation(summary = "Site visit details (SITE_VISIT_VIEW_ANY)")
	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('SITE_VISIT_VIEW_ANY')")
	public SiteVisitResponse get(CurrentActor actor, @PathVariable Long id) {
		return siteVisitService.get(id, actor, true);
	}

	@Operation(summary = "Update fields (SITE_VISIT_UPDATE_ANY)", description = """
			Any of the app fields plus userId and leadId; visit details only change while the visit is upcoming.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SITE_VISIT_UPDATE_ANY')")
	public SiteVisitResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.update(id, actor, request, true);
	}

	@Operation(summary = "Delete (soft delete, SITE_VISIT_DELETE_ANY)")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('SITE_VISIT_DELETE_ANY')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		siteVisitService.delete(id, actor);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Assign or unassign (SITE_VISIT_ASSIGN_ANY)")
	@PatchMapping(path = "/{id}/assign", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SITE_VISIT_ASSIGN_ANY')")
	public SiteVisitResponse assign(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody AssignSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.assign(id, actor, request, true);
	}

	@Operation(summary = "Change status (SITE_VISIT_UPDATE_STATUS_ANY)")
	@PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SITE_VISIT_UPDATE_STATUS_ANY')")
	public SiteVisitResponse changeStatus(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SiteVisitStatusRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.changeStatus(id, actor, request, true);
	}

	@Operation(summary = "Submit or replace the visit report (SITE_VISIT_SUBMIT_REPORT_ANY)")
	@PostMapping(path = "/{id}/report", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SITE_VISIT_SUBMIT_REPORT_ANY')")
	public SiteVisitResponse submitReport(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SiteVisitReportRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.submitReport(id, actor, request, true);
	}

}
