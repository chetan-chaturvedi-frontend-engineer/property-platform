package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.AssignLeadRequest;
import com.propertypro.property_platform.lead.dto.CreateLeadRequest;
import com.propertypro.property_platform.lead.dto.LeadFilter;
import com.propertypro.property_platform.lead.dto.LeadResponse;
import com.propertypro.property_platform.lead.dto.LeadSummaryResponse;
import com.propertypro.property_platform.lead.dto.UpdateLeadRequest;
import com.propertypro.property_platform.lead.service.LeadService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Leads of the mobile app and admin dashboard. Each endpoint works on the caller's own leads, or on
 * any lead for holders of the matching {@code LEAD_*_ANY} permission (see {@code LeadAccessService});
 * others' leads are 404.
 */
@RestController
@RequestMapping(path = "/api/v1/leads", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Leads", description = "Lead CRUD and assignment")
@RequiredArgsConstructor
public class LeadController {

	private final LeadService leadService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a lead", description = """
			Requires LEAD_CREATE; the caller becomes createdBy. assignedTo also requires LEAD_ASSIGN.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public LeadResponse create(CurrentActor actor, @Valid @RequestBody CreateLeadRequest request) {
		rateLimiter.acquire("lead:create:user:" + actor.userId(), limits.leadCreateUser());
		return leadService.create(actor, request);
	}

	@Operation(summary = "List leads", description = """
			All leads with LEAD_LIST_ANY, otherwise the caller's own (LEAD_LIST). page (zero-based), size (max \
			100), sort by createdAt, updatedAt, leadName, status, nextFollowUpAt, lastContactedAt or budgetMax.""")
	@GetMapping
	public PageResponse<LeadSummaryResponse> list(CurrentActor actor, @Valid LeadFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return leadService.list(actor, filter, pageable);
	}

	@Operation(summary = "Lead details (LEAD_VIEW own, LEAD_VIEW_ANY any)")
	@GetMapping("/{id}")
	public LeadResponse get(CurrentActor actor, @PathVariable Long id) {
		return leadService.get(id, actor);
	}

	@Operation(summary = "Update fields (LEAD_UPDATE own, LEAD_UPDATE_ANY any)", description = """
			Omitted fields keep their value; null clears optional ones. A converted lead keeps its status; \
			status lost needs lostReason. The assignee changes through /assign.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public LeadResponse update(CurrentActor actor, @PathVariable Long id, @Valid @RequestBody UpdateLeadRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return leadService.update(id, actor, request);
	}

	@Operation(summary = "Delete (soft delete)", description = """
			LEAD_DELETE for leads the caller created, LEAD_DELETE_ANY for any. Schedules and interactions are kept.""")
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		leadService.delete(id, actor);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Assign or unassign (LEAD_ASSIGN)", description = """
			assignedTo must be an active user whose role lets them view the lead; null unassigns.""")
	@PatchMapping(path = "/{id}/assign", consumes = MediaType.APPLICATION_JSON_VALUE)
	public LeadResponse assign(CurrentActor actor, @PathVariable Long id, @Valid @RequestBody AssignLeadRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return leadService.assign(id, actor, request);
	}

}
