package com.propertypro.property_platform.role.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

public final class RoleExceptions {

	private RoleExceptions() {
	}

	public static ApiException superAdminProtected() {
		return new ApiException(HttpStatus.CONFLICT, "role_super_admin_protected",
				"The super admin role cannot be deactivated, deleted or have its permissions changed.");
	}

	public static ApiException slugReserved() {
		return new ApiException(HttpStatus.CONFLICT, "role_slug_reserved", "This role slug is reserved.");
	}

	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "role_not_found", "Role not found.");
	}

	/** {@code field} is name or slug; slugs of deleted roles stay taken. */
	public static ApiException alreadyExists(String field) {
		return new ApiException(HttpStatus.CONFLICT, "role_already_exists",
				"A role with this " + field + " already exists.", Map.of("errors", Map.of(field, "is already in use")));
	}

	public static ApiException defaultProtected() {
		return new ApiException(HttpStatus.CONFLICT, "role_default_protected",
				"Default roles cannot be deleted.");
	}

	/** Users would silently lose every permission, so they must be moved to another role first. */
	public static ApiException inUse(long userCount) {
		return new ApiException(HttpStatus.CONFLICT, "role_in_use",
				"This role is assigned to " + userCount + " user(s). Assign them another role before deleting it.",
				Map.of("userCount", userCount));
	}

	/** Prevents locking yourself out by removing your own access. */
	public static ApiException selfModification() {
		return new ApiException(HttpStatus.CONFLICT, "role_self_modification",
				"You cannot change the status or permissions of your own role, or delete it.");
	}

	/** The grantor tried to grant, remove or touch permissions they do not hold themselves. */
	public static ApiException permissionEscalation() {
		return new ApiException(HttpStatus.FORBIDDEN, "role_permission_escalation",
				"You can only manage roles whose permissions you hold yourself.");
	}

}
