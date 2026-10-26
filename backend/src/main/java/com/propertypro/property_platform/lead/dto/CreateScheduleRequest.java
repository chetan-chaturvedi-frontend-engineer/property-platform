package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.LeadSchedule;
import com.propertypro.property_platform.lead.domain.ScheduleType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * A new pending activity; it may be in the past. Creator, status and completion are set by the server.
 *
 * @param assignedTo the caller, or a user who can see the lead
 * @param reminderAt not after {@code scheduledAt}
 */
@RejectUnknownFields
public record CreateScheduleRequest(
		@NotNull @Pattern(regexp = ScheduleType.VALUES, message = ONE_OF) String scheduleType,
		@NotBlank @Size(max = LeadSchedule.TITLE_MAX_LENGTH) String title,
		@Size(max = LeadSchedule.DESCRIPTION_MAX_LENGTH) String description,
		@NotNull Instant scheduledAt,
		@Min(1) @Max(LeadSchedule.MAX_DURATION_MINUTES) Integer durationMinutes,
		@Size(max = LeadSchedule.LOCATION_MAX_LENGTH) String location,
		@Positive Long assignedTo,
		Instant reminderAt) {
}
