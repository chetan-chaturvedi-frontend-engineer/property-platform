package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;

import java.time.Instant;
import java.util.List;

/**
 * A publicly visible blog in lists: what the app and website need for cards and SEO, no content and
 * no administrative fields (status, timestamps, deletion, storage keys). {@code metaTitle} and
 * {@code metaDescription} fall back to the title and short description.
 */
public record PublicBlogSummaryResponse(Long id, String title, String slug, String featureImageUrl,
		String shortDescription, PublicCategoryRef category, List<String> tags, Instant publishedAt, String metaTitle,
		String metaDescription) {

	/** The URL changes whenever the image is replaced (random file name), so it can be cached. */
	public static final String FEATURE_IMAGE_PATH = "/api/v1/public/blogs/%s/feature-image/%s";

	/**
	 * @param category the blog's category; visible blogs always have an active one
	 */
	public static PublicBlogSummaryResponse from(Blog blog, BlogCategory category) {
		return new PublicBlogSummaryResponse(blog.getId(), blog.getTitle(), blog.getSlug(), featureImageUrl(blog),
				blog.getShortDescription(), PublicCategoryRef.from(category), BlogResponse.tags(blog),
				blog.getPublishedAt(), metaTitle(blog), metaDescription(blog));
	}

	static String featureImageUrl(Blog blog) {
		return blog.getFeatureImage() == null ? null
				: FEATURE_IMAGE_PATH.formatted(blog.getSlug(), blog.featureImageFileName());
	}

	static String metaTitle(Blog blog) {
		return blog.getMetaTitle() != null ? blog.getMetaTitle() : blog.getTitle();
	}

	static String metaDescription(Blog blog) {
		return blog.getMetaDescription() != null ? blog.getMetaDescription() : blog.getShortDescription();
	}

	/** Category of a public blog: enough to link to its public category page. */
	public record PublicCategoryRef(String title, String slug) {

		static PublicCategoryRef from(BlogCategory category) {
			return category == null ? null : new PublicCategoryRef(category.getTitle(), category.getSlug());
		}

	}

}
