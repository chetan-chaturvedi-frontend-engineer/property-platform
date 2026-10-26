package com.propertypro.property_platform.cms.blog.repository;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The single public visibility rule, used by every public blog query (list, category list, detail and
 * image), so a blog can never be listed but fail the detail or the other way round. Same rule as
 * {@code BlogPublicState.of(...) == LIVE}.
 */
public final class PublicBlogs {

	/** Newest publication first; id breaks ties so pages never overlap. Served by idx_blogs_public_published_at. */
	public static final Sort ORDER = Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("id"));

	private PublicBlogs() {
	}

	/**
	 * Published, not soft-deleted ({@code @SoftDelete}), {@code publishedAt <= now} (server clock) and in
	 * an active, not soft-deleted category.
	 *
	 * @param categorySlug only blogs of this category; null = any category
	 */
	public static Specification<Blog> visible(Instant now, String categorySlug) {
		return (root, query, cb) -> {
			Subquery<Long> category = query.subquery(Long.class);
			Root<BlogCategory> c = category.from(BlogCategory.class);
			List<Predicate> categoryRules = new ArrayList<>();
			categoryRules.add(cb.equal(c.get("id"), root.get("categoryId")));
			categoryRules.add(cb.equal(c.get("status"), BlogCategoryStatus.ACTIVE));
			if (categorySlug != null) {
				categoryRules.add(cb.equal(c.get("slug"), categorySlug));
			}
			category.select(c.get("id")).where(categoryRules.toArray(Predicate[]::new));
			return cb.and(
					cb.equal(root.get("status"), BlogStatus.PUBLISH),
					cb.lessThanOrEqualTo(root.<Instant>get("publishedAt"), now),
					cb.exists(category));
		};
	}

	public static Specification<Blog> withSlug(String slug) {
		return (root, query, cb) -> cb.equal(root.get("slug"), slug);
	}

}
