package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import com.propertypro.property_platform.lead.domain.ScheduleType;

import java.time.Instant;

/** @param rescheduledFromId the earlier activity this one replaced */
public record ScheduleResponse(
		Long id,
		Long leadId,
		ScheduleType scheduleType,
		String title,
		String description,
		Instant scheduledAt,
		Integer durationMinutes,
		String location,
		LeadUserResponse assignedTo,
		LeadUserResponse createdBy,
		ScheduleStatus status,
		Instant reminderAt,
		Instant completedAt,
		String completionNote,
		Long rescheduledFromId,
		Instant createdAt,
		Instant updatedAt) {
}
