package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

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

}
