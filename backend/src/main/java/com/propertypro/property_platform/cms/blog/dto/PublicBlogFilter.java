package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * The only filters of the public blog list. Visibility (status, publication time, deletion, category
 * state) and order are always applied by the server and cannot be changed by parameters.
 *
 * @param search   title or short description contains (case-insensitive)
 * @param category category slug
 * @param tag      normalized like stored tags
 */
public record PublicBlogFilter(
		@Size(max = 100) String search,
		@Size(max = BlogCategory.SLUG_MAX_LENGTH)
		@Pattern(regexp = Blog.SLUG_PATTERN, message = BlogValidation.SLUG_MESSAGE) String category,
		@Size(max = Blog.TAG_MAX_LENGTH) String tag) {
}
