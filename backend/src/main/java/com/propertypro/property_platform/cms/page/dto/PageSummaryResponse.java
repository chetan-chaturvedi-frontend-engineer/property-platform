package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;

import java.time.Instant;

/** Admin list item: no content or SEO fields. */
public record PageSummaryResponse(Long id, String heading, String subHeading, String slug, PageType type,
		PageStatus status, Instant createdAt, Instant updatedAt) {

	public static PageSummaryResponse from(Page page) {
		return new PageSummaryResponse(page.getId(), page.getHeading(), page.getSubHeading(), page.getSlug(),
				page.getType(), page.getStatus(), page.getCreatedAt(), page.getUpdatedAt());
	}

}
