package com.propertypro.property_platform.user.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Map;

/** Errors of the admin user management ({@code /api/v1/admin/users}). */
public final class ManagedUserExceptions {

	private ManagedUserExceptions() {
	}

	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "user_not_found", "User not found.");
	}

	/** {@code field} is email or phone; also when the value belongs to a deleted account. */
	public static ApiException alreadyExists(String field) {
		return new ApiException(HttpStatus.CONFLICT, "user_already_exists",
				"A user with this email or phone already exists.",
				Map.of("errors", Map.of(field, "is already in use")));
	}

	/** A concurrent request took the email or phone between the check and the write. */
	public static ApiException alreadyExists() {
		return new ApiException(HttpStatus.CONFLICT, "user_already_exists",
				"A user with this email or phone already exists.");
	}

	public static ApiException selfModification() {
		return new ApiException(HttpStatus.CONFLICT, "user_self_modification",
				"You cannot delete your own account or change your own role or status.");
	}

	/** Accounts with the super admin role are managed outside the application. */
	public static ApiException protectedAccount() {
		return new ApiException(HttpStatus.CONFLICT, "user_protected",
				"This account is protected and cannot be changed or deleted here.");
	}

	/** The caller may not manage a user whose role grants permissions the caller does not hold. */
	public static ApiException roleForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "user_role_forbidden",
				"You can only manage users and assign roles whose permissions you hold yourself.");
	}

	public static ApiException statusForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "user_status_forbidden",
				"You are not allowed to change the status of user accounts.");
	}

	public static ApiException invalidStatusTransition() {
		return new ApiException(HttpStatus.CONFLICT, "user_invalid_status_transition",
				"An account cannot return to pending once it has left it.");
	}

}
