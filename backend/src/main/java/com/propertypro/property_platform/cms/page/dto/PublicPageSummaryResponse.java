package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;

/** Public list item: enough to link to the page; load the content with the detail endpoint. */
public record PublicPageSummaryResponse(String heading, String subHeading, String slug) {

	public static PublicPageSummaryResponse from(Page page) {
		return new PublicPageSummaryResponse(page.getHeading(), page.getSubHeading(), page.getSlug());
	}

}
