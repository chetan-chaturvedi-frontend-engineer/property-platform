package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogPublicState;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;

import java.time.Instant;
import java.util.List;

/** Admin list item: everything except the content. */
public record BlogSummaryResponse(Long id, String title, String slug, String featureImageUrl, BlogCategoryRef category,
		String shortDescription, BlogStatus status, BlogPublicState publicState, Instant publishedAt,
		List<String> tags, Instant createdAt, Instant updatedAt) {

	public static BlogSummaryResponse from(Blog blog, BlogCategory category, Instant now) {
		return new BlogSummaryResponse(blog.getId(), blog.getTitle(), blog.getSlug(), BlogResponse.featureImageUrl(blog),
				BlogCategoryRef.from(category), blog.getShortDescription(), blog.getStatus(),
				BlogPublicState.of(blog, category, now), blog.getPublishedAt(), BlogResponse.tags(blog),
				blog.getCreatedAt(), blog.getUpdatedAt());
	}

}
