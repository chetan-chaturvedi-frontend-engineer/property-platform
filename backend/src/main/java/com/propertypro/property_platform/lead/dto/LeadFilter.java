package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/**
 * Optional list filters from query parameters; all given filters must match, always within the
 * caller's scope. {@code search} matches name, email (case-insensitive) or phone digits;
 * {@code preferredLocation} is a case-insensitive substring. {@code budgetMin}/{@code budgetMax}
 * select leads whose budget range overlaps the given one. Date bounds are inclusive.
 */
public record LeadFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = LeadStatus.VALUES, message = ONE_OF) String status,
		@Pattern(regexp = LeadPriority.VALUES, message = ONE_OF) String priority,
		@Pattern(regexp = LeadSource.VALUES, message = ONE_OF) String source,
		@Pattern(regexp = LeadPurpose.VALUES, message = ONE_OF) String purpose,
		@Pattern(regexp = LeadPropertyType.VALUES, message = ONE_OF) String propertyType,
		@Positive Long assignedTo,
		@Positive Long createdBy,
		@Size(max = 100) String preferredLocation,
		@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal budgetMin,
		@PositiveOrZero @Digits(integer = 12, fraction = 2) BigDecimal budgetMax,
		Instant createdFrom,
		Instant createdTo,
		Instant nextFollowUpFrom,
		Instant nextFollowUpTo) {
}
