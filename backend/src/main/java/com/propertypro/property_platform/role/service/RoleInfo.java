package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.role.domain.Role;

import java.util.Set;

/**
 * A non-deleted role as other modules see it.
 *
 * @param permissions the codes the role grants right now; empty while inactive
 */
public record RoleInfo(String slug, String name, boolean active, boolean superAdmin, Set<String> permissions) {

	public RoleInfo {
		permissions = Set.copyOf(permissions);
	}

	static RoleInfo from(Role role) {
		return new RoleInfo(role.getSlug(), role.getName(), role.isActive(), role.isSuperAdmin(),
				role.grantedPermissions());
	}

}
