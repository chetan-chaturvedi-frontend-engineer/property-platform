package com.propertypro.property_platform.role.repository;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Derived queries exclude soft-deleted roles; native queries state their own policy. */
public interface RoleRepository extends JpaRepository<Role, Long>, JpaSpecificationExecutor<Role> {

	Optional<Role> findBySlug(String slug);

	List<Role> findBySlugIn(Collection<String> slugs);

	/** Non-deleted roles only, case-insensitive; {@code excludeId} may be null. */
	@Query("SELECT count(r) > 0 FROM Role r WHERE lower(r.name) = lower(:name) AND (:excludeId IS NULL OR r.id <> :excludeId)")
	boolean existsByNameIgnoreCase(String name, Long excludeId);

	/** Slugs are never reused, so soft-deleted roles count too. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM roles WHERE slug = :slug)", nativeQuery = true)
	boolean existsBySlugIncludingDeleted(String slug);

	long countByStatus(RoleStatus status);

	long countBySlugIn(Collection<String> slugs);

	/**
	 * The role whose slug equals the user's {@code user_type}, only while the user is not deleted and
	 * the role is active and not deleted. Empty means the user has no permissions.
	 */
	@Query(value = """
			SELECT r.* FROM roles r JOIN users u ON u.user_type = r.slug
			WHERE u.id = :userId AND u.deleted_at IS NULL AND r.deleted_at IS NULL AND r.status = 'active'""",
			nativeQuery = true)
	Optional<Role> findActiveRoleOfUser(Long userId);

	/** The user's {@code user_type}, whatever the role's state; empty for deleted or unknown users. */
	@Query(value = "SELECT user_type FROM users WHERE id = :userId AND deleted_at IS NULL", nativeQuery = true)
	Optional<String> findUserTypeOfUser(Long userId);

	/** Non-deleted users per role slug ({@code users.user_type}), in one query; slugs without users are absent. */
	@Query(value = """
			SELECT user_type AS slug, count(*) AS total FROM users
			WHERE deleted_at IS NULL AND user_type IN (:slugs) GROUP BY user_type""", nativeQuery = true)
	List<SlugCount> countUsersBySlug(Collection<String> slugs);

	/** Non-deleted users whose active, non-deleted role grants {@code admin_panel.access}. */
	@Query(value = """
			SELECT count(*) FROM users u JOIN roles r ON r.slug = u.user_type
			WHERE u.deleted_at IS NULL AND r.deleted_at IS NULL AND r.status = 'active'
			  AND (r.permissions -> 'admin_panel' ->> 'access') = 'true'""", nativeQuery = true)
	long countAdminPanelUsers();

	interface SlugCount {

		String getSlug();

		long getTotal();

	}

}
