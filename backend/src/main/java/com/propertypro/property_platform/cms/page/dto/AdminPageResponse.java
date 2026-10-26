package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;

import java.time.Instant;

/** Admin view of a page, drafts included. {@code content} is sanitized HTML; the other text is plain text. */
public record AdminPageResponse(Long id, String heading, String subHeading, String slug, String content,
		PageType type, PageStatus status, String metaTitle, String metaDescription, String metaKeywords,
		Instant createdAt, Instant updatedAt) {

	public static AdminPageResponse from(Page page) {
		return new AdminPageResponse(page.getId(), page.getHeading(), page.getSubHeading(), page.getSlug(),
				page.getContent(), page.getType(), page.getStatus(), page.getMetaTitle(), page.getMetaDescription(),
				page.getMetaKeywords(), page.getCreatedAt(), page.getUpdatedAt());
	}

}
