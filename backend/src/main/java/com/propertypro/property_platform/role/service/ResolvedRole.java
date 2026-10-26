package com.propertypro.property_platform.role.service;

import java.util.Set;

/** The active role a user holds right now and the permission codes it grants. */
public record ResolvedRole(String slug, String name, Set<String> permissions) {

	public ResolvedRole {
		permissions = Set.copyOf(permissions);
	}

	public boolean grants(String permission) {
		return permissions.contains(permission);
	}

}
