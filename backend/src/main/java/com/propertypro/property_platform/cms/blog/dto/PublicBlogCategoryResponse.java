package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;

/**
 * An active category for the app and website: no status, timestamps, deletion data or storage keys.
 * {@code metaTitle} falls back to the title.
 */
public record PublicBlogCategoryResponse(Long id, String title, String slug, String icon, String imageUrl,
		String metaTitle, String metaDescription) {

	/** The URL changes whenever the image is replaced (random file name), so it can be cached. */
	public static final String IMAGE_PATH = "/api/v1/public/blog-categories/%s/image/%s";

	public static PublicBlogCategoryResponse from(BlogCategory category) {
		String imageUrl = category.getImage() == null ? null
				: IMAGE_PATH.formatted(category.getSlug(), category.imageFileName());
		return new PublicBlogCategoryResponse(category.getId(), category.getTitle(), category.getSlug(),
				category.getIcon(), imageUrl, category.getMetaTitle() != null ? category.getMetaTitle() : category.getTitle(),
				category.getMetaDescription());
	}

}
