package com.propertypro.property_platform.user.dto;

/**
 * A role for the user management filters and forms.
 *
 * @param active     inactive roles grant nothing and cannot be assigned
 * @param assignable the caller may give this role to a user: active, not super admin, and for a role with admin
 *                   panel access, every permission it grants is one the caller holds
 */
public record UserRoleOptionResponse(String slug, String name, boolean active, boolean assignable) {
}
