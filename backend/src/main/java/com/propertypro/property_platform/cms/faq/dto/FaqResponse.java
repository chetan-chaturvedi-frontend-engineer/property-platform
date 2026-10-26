package com.propertypro.property_platform.cms.faq.dto;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;

import java.time.Instant;

/**
 * Admin view of a FAQ, drafts included. {@code answer} is sanitized HTML. {@code categoryLabel} is null
 * when the category was removed from the configuration (the FAQ is then hidden from public pages).
 */
public record FaqResponse(Long id, String question, String answer, String category, String categoryLabel,
		FaqStatus status, int sortOrder, Instant createdAt, Instant updatedAt) {

	public static FaqResponse from(Faq faq, FaqProperties properties) {
		return new FaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer(), faq.getCategory(),
				properties.label(faq.getCategory()).orElse(null), faq.getStatus(), faq.getSortOrder(),
				faq.getCreatedAt(), faq.getUpdatedAt());
	}

}
