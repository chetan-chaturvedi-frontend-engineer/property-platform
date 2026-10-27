package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.AssignSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.CreateSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.MySiteVisitFilter;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Site visits of the mobile app: only visits the caller is the builder, visitor or assignee of (see
 * {@code SiteVisitAccessService}); others' visits are 404. Admin permissions are never used here.
 */
@RestController
@RequestMapping(path = "/api/v1/site-visits", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Site visits", description = "Booking and managing the caller's own site visits")
@RequiredArgsConstructor
public class SiteVisitController {

	private final SiteVisitService siteVisitService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Book a site visit (SITE_VISIT_CREATE)", description = """
			A published property books the caller as visitor; the caller's own property records a visit without \
			a visitor account. Builder, scheduler and status are set by the server.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public SiteVisitResponse create(CurrentActor actor, @Valid @RequestBody CreateSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:create:user:" + actor.userId(), limits.siteVisitCreateUser());
		return siteVisitService.create(actor, request);
	}

	@Operation(summary = "List my site visits (SITE_VISIT_LIST)", description = """
			Visits the caller is builder, visitor or assignee of, across all their properties. page (zero-based), \
			size (max 100), sort by visitDate, createdAt, updatedAt, nextFollowUp or status.""")
	@GetMapping
	public PageResponse<SiteVisitSummaryResponse> list(CurrentActor actor, @Valid MySiteVisitFilter filter,
			@SortDefault(sort = "visitDate", direction = Sort.Direction.DESC) Pageable pageable) {
		return siteVisitService.listOwn(actor, filter, pageable);
	}

	@Operation(summary = "Site visit details (SITE_VISIT_VIEW)")
	@GetMapping("/{id}")
	public SiteVisitResponse get(CurrentActor actor, @PathVariable Long id) {
		return siteVisitService.get(id, actor, false);
	}

	@Operation(summary = "Update fields (SITE_VISIT_UPDATE)", description = """
			Builder: visitType, visitDate, visitTime, name, mobile, email, numberOfPeople, note, nextFollowUp, \
			followUpNote. Assignee: visitDate, visitTime, numberOfPeople, note, nextFollowUp, followUpNote. The \
			visitor cannot edit. Other fields are 403; visit details only change while the visit is upcoming.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public SiteVisitResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.update(id, actor, request, false);
	}

	@Operation(summary = "Assign or unassign (SITE_VISIT_ASSIGN, builder only)", description = """
			assignId must be the builder or an active user who can work on assigned site visits; null unassigns.""")
	@PatchMapping(path = "/{id}/assign", consumes = MediaType.APPLICATION_JSON_VALUE)
	public SiteVisitResponse assign(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody AssignSiteVisitRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.assign(id, actor, request, false);
	}

	@Operation(summary = "Change status (SITE_VISIT_UPDATE_STATUS)", description = """
			Builder and assignee: confirmed, completed, cancelled, no_show. Visitor: cancelled only.""")
	@PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	public SiteVisitResponse changeStatus(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SiteVisitStatusRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.changeStatus(id, actor, request, false);
	}

	@Operation(summary = "Submit the visit report (SITE_VISIT_SUBMIT_REPORT)", description = """
			Builder or assignee, completed visits only, once; the submitter is the caller.""")
	@PostMapping(path = "/{id}/report", consumes = MediaType.APPLICATION_JSON_VALUE)
	public SiteVisitResponse submitReport(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SiteVisitReportRequest request) {
		rateLimiter.acquire("site-visit:write:user:" + actor.userId(), limits.siteVisitWriteUser());
		return siteVisitService.submitReport(id, actor, request, false);
	}

}
