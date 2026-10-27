package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * Moves an upcoming visit on. {@code rescheduled} is not accepted: it follows from changing the date or time.
 *
 * @param actualVisitDate    {@code completed} only: when the visit took place, not in the future; default now
 * @param cancellationReason required for {@code cancelled}, not allowed otherwise
 */
@RejectUnknownFields
public record SiteVisitStatusRequest(
		@NotNull @Pattern(regexp = SiteVisitStatus.REQUESTABLE_VALUES, message = ONE_OF) String status,
		Instant actualVisitDate,
		@Size(max = SiteVisit.CANCELLATION_REASON_MAX_LENGTH) String cancellationReason) {
}
