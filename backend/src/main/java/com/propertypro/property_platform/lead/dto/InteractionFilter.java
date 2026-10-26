package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.InteractionType;
import jakarta.validation.constraints.Pattern;

import static com.propertypro.property_platform.lead.dto.LeadFieldRules.ONE_OF;

/** Optional query filter of a lead's interactions. */
public record InteractionFilter(@Pattern(regexp = InteractionType.VALUES, message = ONE_OF) String type) {
}
