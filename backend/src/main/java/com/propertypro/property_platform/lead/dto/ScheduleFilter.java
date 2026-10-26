package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import jakarta.validation.constraints.Pattern;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/** Optional query filter of a lead's schedules. */
public record ScheduleFilter(@Pattern(regexp = ScheduleStatus.VALUES, message = ONE_OF) String status) {
}
