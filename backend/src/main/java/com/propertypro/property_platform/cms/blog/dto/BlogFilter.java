package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Optional admin list filters from query parameters; all given filters must match. {@code search}
 * matches the title or slug case-insensitively; {@code tag} is normalized like stored tags; date
 * bounds are inclusive ISO-8601 instants.
 */
public record BlogFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = BlogStatus.VALUES, message = "must be draft or publish") String status,
		@Positive Long categoryId,
		@Size(max = Blog.TAG_MAX_LENGTH) String tag,
		Instant publishedFrom,
		Instant publishedTo,
		Instant createdFrom,
		Instant createdTo) {
}
