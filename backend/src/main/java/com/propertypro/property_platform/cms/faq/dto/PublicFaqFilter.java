package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The only filters of the public FAQ list. Visibility (published, configured category) and order are
 * always applied by the server and cannot be changed by parameters.
 *
 * @param search   question or answer contains (case-insensitive)
 * @param category category key; an unknown or removed one gives an empty list
 */
public record PublicFaqFilter(
		@Size(max = 100) String search,
		@Size(max = Faq.CATEGORY_MAX_LENGTH)
		@Pattern(regexp = Faq.CATEGORY_PATTERN, message = FaqFilter.CATEGORY_MESSAGE) String category) {
}
