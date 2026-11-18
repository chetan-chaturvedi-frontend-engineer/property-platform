package com.propertypro.property_platform.role.repository;

import com.propertypro.property_platform.role.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Derived queries exclude soft-deleted roles; native queries state their own policy. */
public interface RoleRepository extends JpaRepository<Role, Long> {

	Optional<Role> findBySlug(String slug);

	List<Role> findBySlugIn(Collection<String> slugs);

	/**
	 * The role whose slug equals the user's {@code user_type}, only while the user is not deleted and
	 * the role is active and not deleted. Empty means the user has no permissions.
	 */
	@Query(value = """
			SELECT r.* FROM roles r JOIN users u ON u.user_type = r.slug
			WHERE u.id = :userId AND u.deleted_at IS NULL AND r.deleted_at IS NULL AND r.status = 'active'""",
			nativeQuery = true)
	Optional<Role> findActiveRoleOfUser(Long userId);

}
