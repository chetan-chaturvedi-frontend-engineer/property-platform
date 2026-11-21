package com.propertypro.property_platform.role.dto;

/**
 * Counts for the Roles & Permissions page; ignores list filters.
 *
 * @param totalRoles       non-deleted roles
 * @param activeRoles      non-deleted active roles
 * @param defaultRoles     non-deleted roles seeded by migrations (protected from deletion)
 * @param totalPermissions permissions a role can grant (the permission catalog)
 * @param adminUsers       non-deleted users whose active role grants admin panel access
 */
public record RoleStatsResponse(long totalRoles, long activeRoles, long defaultRoles, long totalPermissions,
		long adminUsers) {
}
