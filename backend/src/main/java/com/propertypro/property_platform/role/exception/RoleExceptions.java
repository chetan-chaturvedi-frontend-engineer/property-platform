package com.propertypro.property_platform.role.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

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

	/** The grantor tried to grant, remove or touch permissions they do not hold themselves. */
	public static ApiException permissionEscalation() {
		return new ApiException(HttpStatus.FORBIDDEN, "role_permission_escalation",
				"You can only manage roles whose permissions you hold yourself.");
	}

}
