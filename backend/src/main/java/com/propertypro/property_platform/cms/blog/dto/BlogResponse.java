package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogPublicState;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;

import java.time.Instant;
import java.util.List;

/**
 * Admin view of a blog for the editor, drafts included. {@code featureImageUrl} is an API path that
 * streams the image after authorization (null without an image); storage keys are never exposed.
 * {@code publicState} is computed at response time.
 */
public record BlogResponse(Long id, String title, String slug, String featureImageUrl, BlogCategoryRef category,
		String shortDescription, String content, BlogStatus status, BlogPublicState publicState, Instant publishedAt,
		String metaTitle, String metaDescription, List<String> tags, Instant createdAt, Instant updatedAt) {

	public static final String FEATURE_IMAGE_PATH = "/api/v1/admin/blogs/%d/feature-image/%s";

	/**
	 * @param category the blog's category, or null when it has none
	 */
	public static BlogResponse from(Blog blog, BlogCategory category, Instant now) {
		return new BlogResponse(blog.getId(), blog.getTitle(), blog.getSlug(), featureImageUrl(blog),
				BlogCategoryRef.from(category), blog.getShortDescription(), blog.getContent(), blog.getStatus(),
				BlogPublicState.of(blog, category, now), blog.getPublishedAt(), blog.getMetaTitle(),
				blog.getMetaDescription(), tags(blog), blog.getCreatedAt(), blog.getUpdatedAt());
	}

	static String featureImageUrl(Blog blog) {
		return blog.getFeatureImage() == null ? null : FEATURE_IMAGE_PATH.formatted(blog.getId(), blog.featureImageFileName());
	}

	/** Never null in responses. */
	static List<String> tags(Blog blog) {
		return blog.getTags() == null ? List.of() : List.copyOf(blog.getTags());
	}

}
