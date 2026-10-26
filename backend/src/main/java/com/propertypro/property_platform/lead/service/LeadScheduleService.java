package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadSchedule;
import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import com.propertypro.property_platform.lead.domain.ScheduleType;
import com.propertypro.property_platform.lead.dto.CreateScheduleRequest;
import com.propertypro.property_platform.lead.dto.RescheduleRequest;
import com.propertypro.property_platform.lead.dto.ScheduleResponse;
import com.propertypro.property_platform.lead.dto.UpdateScheduleRequest;
import com.propertypro.property_platform.lead.exception.LeadExceptions;
import com.propertypro.property_platform.lead.mapper.LeadResponseMapper;
import com.propertypro.property_platform.lead.repository.LeadScheduleRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

import static com.propertypro.property_platform.lead.service.LeadService.apply;
import static com.propertypro.property_platform.lead.service.LeadService.stripToNull;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_VIEW;

/**
 * Planned activities of a lead. Every call first checks the parent lead through
 * {@link LeadAccessService}, then loads the schedule by id <em>and</em> lead id. Only pending
 * activities change; rescheduling keeps the original row and creates its replacement.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeadScheduleService {

	static final List<String> SORTABLE_FIELDS = List.of("scheduledAt", "createdAt", "updatedAt");

	private final LeadScheduleRepository scheduleRepository;
	private final LeadAccessService access;
	private final LeadAssigneeService assignees;
	private final LeadResponseMapper mapper;
	private final Clock clock;

	@Transactional(readOnly = true)
	public PageResponse<ScheduleResponse> list(Long leadId, CurrentActor actor, String status, Pageable pageable) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_VIEW, false);
		PageRequest page = LeadPaging.of(pageable, SORTABLE_FIELDS);
		Page<LeadSchedule> schedules = status == null ? scheduleRepository.findByLeadId(lead.getId(), page)
				: scheduleRepository.findByLeadIdAndStatus(lead.getId(), ScheduleStatus.fromValue(status), page);
		return PageResponse.of(schedules, mapper.schedules(schedules.getContent()));
	}

	@Transactional(readOnly = true)
	public ScheduleResponse get(Long leadId, Long scheduleId, CurrentActor actor) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_VIEW, false);
		return mapper.toResponse(find(lead, scheduleId));
	}

	@Transactional
	public ScheduleResponse create(Long leadId, CurrentActor actor, CreateScheduleRequest request) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_CREATE, true);
		LeadSchedule schedule = new LeadSchedule(lead.getId(), actor.userId(),
				ScheduleType.fromValue(request.scheduleType()), request.title().strip(), request.scheduledAt());
		schedule.setDescription(stripToNull(request.description()));
		schedule.setDurationMinutes(request.durationMinutes());
		schedule.setLocation(stripToNull(request.location()));
		schedule.setAssignedTo(eligibleAssignee(request.assignedTo(), lead, actor));
		schedule.setReminderAt(request.reminderAt());
		requireReminderBeforeSchedule(schedule.getReminderAt(), schedule.getScheduledAt());
		scheduleRepository.saveAndFlush(schedule);
		return mapper.toResponse(schedule);
	}

	@Transactional
	public ScheduleResponse update(Long leadId, Long scheduleId, CurrentActor actor, UpdateScheduleRequest request) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_UPDATE, true);
		LeadSchedule schedule = find(lead, scheduleId);
		if (schedule.getStatus() != ScheduleStatus.PENDING) {
			if (schedule.getStatus() == ScheduleStatus.COMPLETED && onlyCompletionNote(request)) {
				schedule.changeCompletionNote(stripToNull(request.getCompletionNote().orElse(null)));
				scheduleRepository.flush();
				return mapper.toResponse(schedule);
			}
			throw LeadExceptions.scheduleNotEditable(schedule.getStatus());
		}
		apply(request.getScheduleType(), value -> schedule.setScheduleType(ScheduleType.fromValue(value)));
		apply(request.getTitle(), value -> schedule.setTitle(value.strip()));
		apply(request.getDescription(), value -> schedule.setDescription(stripToNull(value)));
		apply(request.getDurationMinutes(), schedule::setDurationMinutes);
		apply(request.getLocation(), value -> schedule.setLocation(stripToNull(value)));
		apply(request.getAssignedTo(), value -> schedule.setAssignedTo(eligibleAssignee(value, lead, actor)));
		apply(request.getReminderAt(), schedule::setReminderAt);
		requireReminderBeforeSchedule(schedule.getReminderAt(), schedule.getScheduledAt());
		String note = request.getCompletionNote() == null ? null : stripToNull(request.getCompletionNote().orElse(null));
		if (request.getStatus() != null) {
			if (ScheduleStatus.fromValue(request.getStatus().orElseThrow()) == ScheduleStatus.COMPLETED) {
				schedule.complete(clock.instant(), note);
			}
			else {
				schedule.cancel(note);
			}
		}
		else if (request.getCompletionNote() != null) {
			throw new FieldValidationException("completionNote", "can only be set when completing or cancelling");
		}
		scheduleRepository.flush();
		return mapper.toResponse(schedule);
	}

	/**
	 * Marks the pending activity rescheduled and creates its replacement at the new time, in one
	 * transaction; returns the replacement.
	 */
	@Transactional
	public ScheduleResponse reschedule(Long leadId, Long scheduleId, CurrentActor actor, RescheduleRequest request) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_UPDATE, true);
		LeadSchedule schedule = find(lead, scheduleId);
		if (schedule.getStatus() != ScheduleStatus.PENDING) {
			throw LeadExceptions.scheduleNotEditable(schedule.getStatus());
		}
		requireReminderBeforeSchedule(request.reminderAt(), request.scheduledAt());
		LeadSchedule replacement = schedule.rescheduleTo(request.scheduledAt(), request.reminderAt(), actor.userId(),
				stripToNull(request.reason()));
		scheduleRepository.saveAndFlush(replacement);
		log.info("Lead schedule rescheduled leadId={} scheduleId={} replacementId={} by={}", lead.getId(),
				schedule.getId(), replacement.getId(), actor.userId());
		return mapper.toResponse(replacement);
	}

	/** Soft delete; the lead and the other schedules are not touched. */
	@Transactional
	public void delete(Long leadId, Long scheduleId, CurrentActor actor) {
		Lead lead = access.requireForNested(leadId, actor, LEAD_SCHEDULE_DELETE, true);
		scheduleRepository.delete(find(lead, scheduleId));
		scheduleRepository.flush();
		log.info("Lead schedule deleted leadId={} scheduleId={} by={}", lead.getId(), scheduleId, actor.userId());
	}

	private LeadSchedule find(Lead lead, Long scheduleId) {
		return scheduleRepository.findByIdAndLeadId(scheduleId, lead.getId())
			.orElseThrow(LeadExceptions::scheduleNotFound);
	}

	/** The actor may always assign themselves; anyone else must be able to view the lead. */
	private Long eligibleAssignee(Long userId, Lead lead, CurrentActor actor) {
		if (userId != null && !Objects.equals(userId, actor.userId())) {
			assignees.requireEligibleScheduleAssignee(userId, lead, "assignedTo");
		}
		return userId;
	}

	private static boolean onlyCompletionNote(UpdateScheduleRequest request) {
		return request.getCompletionNote() != null && request.getScheduleType() == null && request.getTitle() == null
				&& request.getDescription() == null && request.getDurationMinutes() == null
				&& request.getLocation() == null && request.getAssignedTo() == null && request.getReminderAt() == null
				&& request.getStatus() == null;
	}

	private static void requireReminderBeforeSchedule(Instant reminderAt, Instant scheduledAt) {
		if (reminderAt != null && reminderAt.isAfter(scheduledAt)) {
			throw new FieldValidationException("reminderAt", "must not be after scheduledAt");
		}
	}

}
