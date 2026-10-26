package com.propertypro.property_platform.cms.blog.repository;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BlogCategoryRepository extends JpaRepository<BlogCategory, Long>,
		JpaSpecificationExecutor<BlogCategory> {

	Optional<BlogCategory> findBySlug(String slug);

	/** Served by idx_blog_categories_status; soft-deleted categories are excluded by {@code @SoftDelete}. */
	Page<BlogCategory> findAllByStatus(BlogCategoryStatus status, Pageable pageable);

	/** Includes soft-deleted categories: their slugs stay reserved. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM blog_categories WHERE slug = :slug)", nativeQuery = true)
	boolean isSlugTaken(@Param("slug") String slug);

	/**
	 * Serializes slug assignment for all categories until the transaction ends, so a check followed by
	 * an insert or update cannot race. Category writes are rare admin actions, so one lock is enough;
	 * {@code uq_blog_categories_slug} remains the final guard.
	 */
	@Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext('blog_categories.slug'))", nativeQuery = true)
	int lockSlugs();

	/**
	 * The non-deleted category, row-locked until the transaction ends. Blog assignment reads it with
	 * {@link #findByIdForShare}, so it waits for, and then sees, a concurrent delete.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM BlogCategory c WHERE c.id = :id")
	Optional<BlogCategory> findByIdForUpdate(@Param("id") Long id);

	/** The non-deleted category, share-locked so it cannot be deleted before the assigning blog commits. */
	@Lock(LockModeType.PESSIMISTIC_READ)
	@Query("SELECT c FROM BlogCategory c WHERE c.id = :id")
	Optional<BlogCategory> findByIdForShare(@Param("id") Long id);

	/** Rows using the storage key, soft-deleted ones included (they keep their image). */
	@Query(value = "SELECT count(*) FROM blog_categories WHERE image = :image", nativeQuery = true)
	long countAllByImageIncludingDeleted(@Param("image") String image);

}
