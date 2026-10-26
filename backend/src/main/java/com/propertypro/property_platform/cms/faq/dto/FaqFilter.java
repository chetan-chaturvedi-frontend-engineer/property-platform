package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Optional admin list filters from query parameters; all given filters must match.
 *
 * @param search   question or answer contains (case-insensitive)
 * @param category any well-formed key, so FAQs of a category removed from the configuration can still
 *                 be found and moved
 */
public record FaqFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = FaqStatus.VALUES, message = "must be draft or publish") String status,
		@Size(max = Faq.CATEGORY_MAX_LENGTH)
		@Pattern(regexp = Faq.CATEGORY_PATTERN, message = FaqFilter.CATEGORY_MESSAGE) String category) {

	static final String CATEGORY_MESSAGE = "must be a category key (lowercase letters, digits and '_')";

}
