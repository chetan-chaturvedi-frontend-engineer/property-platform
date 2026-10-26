package com.propertypro.property_platform.cms.blog.repository;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Public queries go through {@link PublicBlogs}, so the list and the detail apply the same rule. */
public interface BlogRepository extends JpaRepository<Blog, Long>, JpaSpecificationExecutor<Blog> {

	Optional<Blog> findBySlug(String slug);

	/** Includes soft-deleted blogs: their slugs stay reserved. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM blogs WHERE slug = :slug)", nativeQuery = true)
	boolean isSlugTaken(@Param("slug") String slug);

	/**
	 * Serializes slug assignment for all blogs until the transaction ends, so a check followed by an
	 * insert or update cannot race; {@code uq_blogs_slug} remains the final guard.
	 */
	@Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext('blogs.slug'))", nativeQuery = true)
	int lockSlugs();

	/** Rows using the storage key, soft-deleted ones included (they keep their image). */
	@Query(value = "SELECT count(*) FROM blogs WHERE feature_image = :image", nativeQuery = true)
	long countAllByFeatureImageIncludingDeleted(@Param("image") String image);

	/** Non-deleted blogs of a category, including drafts; used before a category is deleted. */
	long countByCategoryId(Long categoryId);

	/** Non-deleted blogs per category, in one query; categories without blogs are absent. */
	@Query("""
			SELECT b.categoryId AS categoryId, count(b) AS blogCount FROM Blog b
			WHERE b.categoryId IN :categoryIds
			GROUP BY b.categoryId""")
	List<CategoryBlogCount> countByCategoryIds(@Param("categoryIds") Collection<Long> categoryIds);

	interface CategoryBlogCount {

		Long getCategoryId();

		long getBlogCount();

	}

}
