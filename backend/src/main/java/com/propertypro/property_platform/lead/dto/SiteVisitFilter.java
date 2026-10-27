package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.SiteVisitInterest;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import com.propertypro.property_platform.lead.domain.SiteVisitType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * Admin list filters from query parameters; all given filters must match. {@code search} matches the
 * visitor's name, email (case-insensitive), mobile digits or the visit code. Date bounds are inclusive.
 */
public record SiteVisitFilter(
		@Size(max = 100) String search,
		@Positive Long propertyId,
		@Positive Long builderId,
		@Positive Long assignId,
		@Positive Long userId,
		@Positive Long leadId,
		@Pattern(regexp = SiteVisitStatus.VALUES, message = ONE_OF) String status,
		@Pattern(regexp = SiteVisitType.VALUES, message = ONE_OF) String visitType,
		@Pattern(regexp = SiteVisitInterest.VALUES, message = ONE_OF) String interest,
		LocalDate visitDateFrom,
		LocalDate visitDateTo,
		Instant nextFollowUpFrom,
		Instant nextFollowUpTo) {
}
