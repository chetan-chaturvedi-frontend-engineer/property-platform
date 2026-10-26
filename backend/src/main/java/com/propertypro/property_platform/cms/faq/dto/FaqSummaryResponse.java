package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;

import java.time.Instant;

/** Admin list item: everything except the answer. */
public record FaqSummaryResponse(Long id, String question, String category, String categoryLabel, FaqStatus status,
		int sortOrder, Instant createdAt, Instant updatedAt) {

	public static FaqSummaryResponse from(Faq faq, FaqProperties properties) {
		return new FaqSummaryResponse(faq.getId(), faq.getQuestion(), faq.getCategory(),
				properties.label(faq.getCategory()).orElse(null), faq.getStatus(), faq.getSortOrder(),
				faq.getCreatedAt(), faq.getUpdatedAt());
	}

}
