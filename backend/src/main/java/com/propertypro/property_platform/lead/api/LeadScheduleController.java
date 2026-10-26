package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.CreateScheduleRequest;
import com.propertypro.property_platform.lead.dto.RescheduleRequest;
import com.propertypro.property_platform.lead.dto.ScheduleFilter;
import com.propertypro.property_platform.lead.dto.ScheduleResponse;
import com.propertypro.property_platform.lead.dto.UpdateScheduleRequest;
import com.propertypro.property_platform.lead.service.LeadScheduleService;
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
 * Planned activities of a lead. The lead must be viewable by the caller (404 otherwise) and each
 * endpoint needs its {@code LEAD_SCHEDULE_*} permission (403 otherwise).
 */
@RestController
@RequestMapping(path = "/api/v1/leads/{leadId}/schedules", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Lead schedules", description = "Calls, follow-ups, meetings and site visits of a lead")
@RequiredArgsConstructor
public class LeadScheduleController {

	private final LeadScheduleService scheduleService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List schedules (LEAD_SCHEDULE_VIEW)", description = """
			Optional status filter. Sort by scheduledAt (default, newest first), createdAt or updatedAt.""")
	@GetMapping
	public PageResponse<ScheduleResponse> list(CurrentActor actor, @PathVariable Long leadId,
			@Valid ScheduleFilter filter,
			@SortDefault(sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return scheduleService.list(leadId, actor, filter.status(), pageable);
	}

	@GetMapping("/{scheduleId}")
	public ScheduleResponse get(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long scheduleId) {
		return scheduleService.get(leadId, scheduleId, actor);
	}

	@Operation(summary = "Create a pending schedule (LEAD_SCHEDULE_CREATE)")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public ScheduleResponse create(CurrentActor actor, @PathVariable Long leadId,
			@Valid @RequestBody CreateScheduleRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return scheduleService.create(leadId, actor, request);
	}

	@Operation(summary = "Edit, complete or cancel (LEAD_SCHEDULE_UPDATE)", description = """
			Pending schedules only (409 otherwise); a completed one accepts only completionNote. status: \
			completed or cancelled. The time changes through /reschedule.""")
	@PatchMapping(path = "/{scheduleId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ScheduleResponse update(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long scheduleId,
			@Valid @RequestBody UpdateScheduleRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return scheduleService.update(leadId, scheduleId, actor, request);
	}

	@Operation(summary = "Reschedule (LEAD_SCHEDULE_UPDATE)", description = """
			Marks the pending schedule rescheduled and returns its replacement at the new time (201).""")
	@PostMapping(path = "/{scheduleId}/reschedule", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public ScheduleResponse reschedule(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long scheduleId,
			@Valid @RequestBody RescheduleRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return scheduleService.reschedule(leadId, scheduleId, actor, request);
	}

	@Operation(summary = "Delete (soft delete, LEAD_SCHEDULE_DELETE)", description = "To keep it visible, cancel instead.")
	@DeleteMapping("/{scheduleId}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long scheduleId) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		scheduleService.delete(leadId, scheduleId, actor);
		return ResponseEntity.noContent().build();
	}

}
