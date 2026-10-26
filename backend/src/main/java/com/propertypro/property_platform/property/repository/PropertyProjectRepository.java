package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyProject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/** Derived queries exclude soft-deleted projects; native queries state their own policy. */
public interface PropertyProjectRepository extends JpaRepository<PropertyProject, Long> {

	Page<PropertyProject> findByUserId(Long userId, Pageable pageable);

	/** Projects that count toward the owner's property limit (see {@code PropertyLimitGuard}). */
	long countByUserId(Long userId);

	/** Owner-scoped lookup: another user's project is reported as not found. */
	Optional<PropertyProject> findByIdAndUserId(Long id, Long userId);

	Optional<PropertyProject> findBySlug(String slug);

	/** Includes soft-deleted projects: their slugs are never reused. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM property_projects WHERE slug = :slug)", nativeQuery = true)
	boolean existsBySlugIncludingDeleted(String slug);

	/** The project, row-locked until the transaction ends, so changes to one project run one after another. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select p from PropertyProject p where p.id = :id")
	Optional<PropertyProject> findByIdForUpdate(Long id);

	/** Includes soft-deleted projects, so a key is never reused for a second project. */
	@Query(value = "SELECT id FROM property_projects WHERE user_id = :userId AND idempotency_key = :key",
			nativeQuery = true)
	Optional<Long> findIdByIdempotencyKeyIncludingDeleted(Long userId, String key);

	/** Serializes creations with the same owner and Idempotency-Key until the transaction ends. */
	@Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext('property_projects.idempotency:' || :userId || ':' || :key))",
			nativeQuery = true)
	int lockIdempotencyKey(Long userId, String key);

	/** Undoes a soft delete; returns 0 if the project is not deleted. */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query(value = "UPDATE property_projects SET deleted_at = NULL, updated_at = now(), version = version + 1 "
			+ "WHERE id = :id AND deleted_at IS NOT NULL", nativeQuery = true)
	int restore(Long id);

	/**
	 * Serializes slug allocation for one base slug until the current transaction ends, so two
	 * concurrent creations cannot pick the same free slug.
	 */
	@Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext('property_projects.slug:' || :baseSlug))",
			nativeQuery = true)
	int lockSlugBase(String baseSlug);

}
