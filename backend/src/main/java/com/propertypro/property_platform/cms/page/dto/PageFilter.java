package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Optional admin list filters from query parameters; all given filters must match.
 *
 * @param search heading, sub heading or slug contains (case-insensitive)
 */
public record PageFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = PageStatus.VALUES, message = PageValidation.STATUS_MESSAGE) String status,
		@Pattern(regexp = PageType.VALUES, message = PageValidation.TYPE_MESSAGE) String type) {
}
