package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;

import java.time.Instant;

/**
 * Admin view of a blog category. {@code imageUrl} is an API path that streams the image after
 * authorization (null without an image); storage keys are never exposed. {@code blogCount} counts
 * non-deleted blogs, drafts included; a category is deletable only while it is 0.
 */
public record BlogCategoryResponse(Long id, String title, String slug, String icon, String imageUrl,
		BlogCategoryStatus status, String metaTitle, String metaDescription, long blogCount, Instant createdAt,
		Instant updatedAt) {

	public static final String IMAGE_PATH = "/api/v1/admin/blog-categories/%d/image/%s";

	public static BlogCategoryResponse from(BlogCategory category, long blogCount) {
		String imageUrl = category.getImage() == null ? null
				: IMAGE_PATH.formatted(category.getId(), category.imageFileName());
		return new BlogCategoryResponse(category.getId(), category.getTitle(), category.getSlug(), category.getIcon(),
				imageUrl, category.getStatus(), category.getMetaTitle(), category.getMetaDescription(), blogCount,
				category.getCreatedAt(), category.getUpdatedAt());
	}

}
