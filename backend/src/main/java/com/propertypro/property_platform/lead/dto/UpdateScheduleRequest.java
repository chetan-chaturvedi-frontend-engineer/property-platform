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
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Optional;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * Partial update of a pending activity; omitted fields keep their value, explicit {@code null} clears
 * optional ones. {@code status} completes or cancels it (only from pending). A completed activity
 * accepts only {@code completionNote}. The time changes only through {@code .../reschedule}, which
 * keeps the original row, so {@code scheduledAt} is rejected here.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateScheduleRequest {

	private Optional<@NotNull @Pattern(regexp = ScheduleType.VALUES, message = ONE_OF) String> scheduleType;

	private Optional<@NotBlank @Size(max = LeadSchedule.TITLE_MAX_LENGTH) String> title;

	private Optional<@Size(max = LeadSchedule.DESCRIPTION_MAX_LENGTH) String> description;

	private Optional<@Min(1) @Max(LeadSchedule.MAX_DURATION_MINUTES) Integer> durationMinutes;

	private Optional<@Size(max = LeadSchedule.LOCATION_MAX_LENGTH) String> location;

	private Optional<@Positive Long> assignedTo;

	private Optional<Instant> reminderAt;

	private Optional<@NotNull @Pattern(regexp = "completed|cancelled", message = "must be completed or cancelled") String> status;

	private Optional<@Size(max = LeadSchedule.COMPLETION_NOTE_MAX_LENGTH) String> completionNote;

}
