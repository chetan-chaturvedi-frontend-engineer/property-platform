package com.propertypro.property_platform.cms.page.repository;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PageRepository extends JpaRepository<Page, Long>, JpaSpecificationExecutor<Page> {

	Optional<Page> findBySlug(String slug);

	/** Public detail: the status is part of the query, so drafts are never loaded. */
	Optional<Page> findBySlugAndStatus(String slug, PageStatus status);

	/** Public list; served by {@code idx_pages_status_type}. */
	org.springframework.data.domain.Page<Page> findByStatus(PageStatus status, Pageable pageable);

	/** Slug check on create; {@code uq_pages_slug} remains the final guard. */
	boolean existsBySlug(String slug);

	/** Slug check on update, ignoring the page being updated. */
	boolean existsBySlugAndIdNot(String slug, Long id);

	/**
	 * Serializes slug assignment for all pages until the transaction ends, so a check followed by an
	 * insert or update cannot race; {@code uq_pages_slug} remains the final guard.
	 */
	@Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext('pages.slug'))", nativeQuery = true)
	int lockSlugs();

	/** Hard delete in one statement; 0 when the page does not exist (also when deleted concurrently). */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("DELETE FROM Page p WHERE p.id = :id")
	int deletePageById(@Param("id") Long id);

}
