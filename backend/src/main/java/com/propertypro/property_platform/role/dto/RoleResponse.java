package com.propertypro.property_platform.role.dto;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;

import java.time.Instant;
import java.util.Map;

/**
 * A role as the admin dashboard sees it, with what the caller may do with it. The flags only guide the UI;
 * every write checks the same rules again.
 *
 * @param permissions {@code {"<module>": {"<action>": true|false}}}; missing or false means not granted
 * @param defaultRole seeded by migrations; cannot be deleted
 * @param superAdmin  managed by migrations only; never changed through the API
 * @param userCount   non-deleted users holding the role
 * @param manageable  the caller holds every permission the role grants, and the role is not super admin, so the
 *                    caller may edit its name and description
 * @param ownRole     the caller's own role; its status and permissions cannot be changed, nor can it be deleted, by
 *                    the caller
 */
public record RoleResponse(Long id, String name, String slug, String description, RoleStatus status,
		Map<String, Map<String, Boolean>> permissions, boolean defaultRole, boolean superAdmin, long userCount,
		boolean manageable, boolean ownRole, Instant createdAt, Instant updatedAt) {

	public static RoleResponse from(Role role, long userCount, boolean manageable, boolean ownRole) {
		return new RoleResponse(role.getId(), role.getName(), role.getSlug(), role.getDescription(), role.getStatus(),
				role.getPermissions(), role.isDefault(), role.isSuperAdmin(), userCount, manageable, ownRole,
				role.getCreatedAt(), role.getUpdatedAt());
	}

}
