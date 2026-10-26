package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.LeadSchedule;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * @param reminderAt for the new activity; not after {@code scheduledAt}
 * @param reason     stored as the completion note of the original, now rescheduled, activity
 */
@RejectUnknownFields
public record RescheduleRequest(
		@NotNull Instant scheduledAt,
		Instant reminderAt,
		@Size(max = LeadSchedule.COMPLETION_NOTE_MAX_LENGTH) String reason) {
}
