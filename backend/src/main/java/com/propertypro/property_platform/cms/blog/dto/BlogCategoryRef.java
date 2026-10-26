package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;

/** The category of a blog in admin responses; its status explains a {@code category_hidden} blog. */
public record BlogCategoryRef(Long id, String title, String slug, BlogCategoryStatus status) {

	/** Null for a blog without a category. */
	public static BlogCategoryRef from(BlogCategory category) {
		return category == null ? null
				: new BlogCategoryRef(category.getId(), category.getTitle(), category.getSlug(), category.getStatus());
	}

}
