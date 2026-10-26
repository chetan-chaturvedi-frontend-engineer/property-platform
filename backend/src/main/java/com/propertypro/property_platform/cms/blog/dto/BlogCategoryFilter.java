package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Optional admin list filters from query parameters; all given filters must match. {@code search}
 * matches the title or slug case-insensitively.
 */
public record BlogCategoryFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = BlogCategoryStatus.VALUES, message = "must be active or inactive") String status) {
}
