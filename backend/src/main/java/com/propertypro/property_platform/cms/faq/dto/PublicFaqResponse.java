package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.cms.faq.domain.Faq;

/**
 * A published FAQ. No status, timestamps or other admin data. {@code answer} is HTML that was sanitized
 * with an allow-list when it was saved. Only FAQs of configured categories are public, so
 * {@code categoryLabel} is always set.
 */
public record PublicFaqResponse(Long id, String question, String answer, String category, String categoryLabel,
		int sortOrder) {

	public static PublicFaqResponse from(Faq faq, FaqProperties properties) {
		return new PublicFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer(), faq.getCategory(),
				properties.label(faq.getCategory()).orElse(faq.getCategory()), faq.getSortOrder());
	}

}
