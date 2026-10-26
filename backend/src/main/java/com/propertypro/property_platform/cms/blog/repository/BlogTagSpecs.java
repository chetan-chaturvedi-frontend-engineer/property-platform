package com.propertypro.property_platform.cms.blog.repository;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import org.springframework.data.jpa.domain.Specification;

public final class BlogTagSpecs {

	private BlogTagSpecs() {
	}

	/**
	 * Blogs whose JSONB {@code tags} array contains exactly this (normalized) tag; whole tags only, so
	 * "home" does not match "home loans". The value is bound as a parameter, never concatenated into SQL.
	 */
	public static Specification<Blog> hasTag(String tag) {
		return (root, query, cb) -> cb.isTrue(cb.function("jsonb_exists", Boolean.class, root.get("tags"), cb.literal(tag)));
	}

}
