package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.domain.SiteVisitInterest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * The full report of a completed visit; it replaces any earlier one, so omitted fields are cleared.
 * The submitter is always the authenticated user.
 *
 * @param duration     minutes the visit took
 * @param nextFollowUp after the visit took place
 */
@RejectUnknownFields
public record SiteVisitReportRequest(
		@NotNull @Pattern(regexp = SiteVisitInterest.VALUES, message = ONE_OF) String interest,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String visitNote,
		@Min(1) @Max(SiteVisit.MAX_DURATION_MINUTES) Integer duration,
		@Size(max = SiteVisit.VISITED_WITH_MAX_LENGTH) String visitedWith,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String feedback,
		@Min(SiteVisit.MIN_RATING) @Max(SiteVisit.MAX_RATING) Integer rating,
		Instant nextFollowUp,
		@Size(max = SiteVisit.NOTE_MAX_LENGTH) String followUpNote) {
}
