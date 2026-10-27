package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import com.propertypro.property_platform.lead.domain.SiteVisitType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * App list filters; always within the caller's own visits, so no filter can widen the scope.
 *
 * @param relation only visits where the caller is the {@code builder}, {@code assignee} or {@code visitor}
 * @param when     {@code upcoming}: visit date today or later; {@code past}: before today (property time zone)
 */
public record MySiteVisitFilter(
		@Positive Long propertyId,
		@Pattern(regexp = SiteVisitStatus.VALUES, message = ONE_OF) String status,
		@Pattern(regexp = SiteVisitType.VALUES, message = ONE_OF) String visitType,
		LocalDate visitDateFrom,
		LocalDate visitDateTo,
		@Pattern(regexp = "upcoming|past", message = ONE_OF) String when,
		@Pattern(regexp = "builder|assignee|visitor", message = ONE_OF) String relation) {
}
