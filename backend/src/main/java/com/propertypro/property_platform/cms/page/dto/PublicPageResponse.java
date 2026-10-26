package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;

/**
 * A published page. No id, type, status, timestamps or other admin data. {@code content} is HTML that
 * was sanitized with an allow-list when it was saved; the other fields are plain text.
 */
public record PublicPageResponse(String heading, String subHeading, String slug, String content, String metaTitle,
		String metaDescription, String metaKeywords) {

	public static PublicPageResponse from(Page page) {
		return new PublicPageResponse(page.getHeading(), page.getSubHeading(), page.getSlug(), page.getContent(),
				page.getMetaTitle(), page.getMetaDescription(), page.getMetaKeywords());
	}

}
