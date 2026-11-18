package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolePermissionService {

	private final RoleRepository roleRepository;

	/**
	 * Permission codes granted by the user's role ({@code users.user_type} = {@code roles.slug}).
	 * Read on every request and deliberately not cached, so deactivating or deleting a role, or
	 * changing its permissions, takes effect on the next request.
	 */
	@Transactional(readOnly = true)
	public Set<String> permissionsOfUser(Long userId) {
		return roleRepository.findActiveRoleOfUser(userId).map(Role::grantedPermissions).orElse(Set.of());
	}

	/**
	 * The user's role through the same mapping. Empty when no active, non-deleted role has the slug in
	 * {@code users.user_type} (or the user is deleted): such a user has no permissions at all.
	 */
	@Transactional(readOnly = true)
	public Optional<ResolvedRole> roleOfUser(Long userId) {
		return roleRepository.findActiveRoleOfUser(userId)
			.map(role -> new ResolvedRole(role.getSlug(), role.getName(), role.grantedPermissions()));
	}

	/** The active, non-deleted role with this slug; empty otherwise. */
	@Transactional(readOnly = true)
	public Optional<ResolvedRole> findActiveRole(String slug) {
		return roleRepository.findBySlug(slug)
			.filter(Role::isActive)
			.map(role -> new ResolvedRole(role.getSlug(), role.getName(), role.grantedPermissions()));
	}

	/** Every non-deleted role, active or not, by name. Roles are few, so this is not paginated. */
	@Transactional(readOnly = true)
	public List<RoleInfo> listRoles() {
		return roleRepository.findAll(Sort.by("name", "id")).stream().map(RoleInfo::from).toList();
	}

	/** The non-deleted roles with these slugs, by slug, in one query; slugs without a role are absent. */
	@Transactional(readOnly = true)
	public Map<String, RoleInfo> findRoles(Collection<String> slugs) {
		if (slugs.isEmpty()) {
			return Map.of();
		}
		return roleRepository.findBySlugIn(Set.copyOf(slugs)).stream()
			.map(RoleInfo::from)
			.collect(Collectors.toMap(RoleInfo::slug, Function.identity()));
	}

}
