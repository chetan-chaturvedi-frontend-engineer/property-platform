package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogSummaryResponse.PublicCategoryRef;

import java.time.Instant;
import java.util.List;

/**
 * A publicly visible blog with its full content. {@code content} is HTML that was sanitized with an
 * allow-list when it was saved. Same fields and fallbacks as {@link PublicBlogSummaryResponse}.
 */
public record PublicBlogResponse(Long id, String title, String slug, String featureImageUrl, String shortDescription,
		String content, PublicCategoryRef category, List<String> tags, Instant publishedAt, String metaTitle,
		String metaDescription) {

	public static PublicBlogResponse from(Blog blog, BlogCategory category) {
		return new PublicBlogResponse(blog.getId(), blog.getTitle(), blog.getSlug(),
				PublicBlogSummaryResponse.featureImageUrl(blog), blog.getShortDescription(), blog.getContent(),
				PublicCategoryRef.from(category), BlogResponse.tags(blog), blog.getPublishedAt(),
				PublicBlogSummaryResponse.metaTitle(blog), PublicBlogSummaryResponse.metaDescription(blog));
	}

}
