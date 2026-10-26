package com.propertypro.property_platform.auth.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/** Authentication errors. Messages are deliberately generic where they could reveal accounts. */
public final class AuthExceptions {

	private AuthExceptions() {
	}

	/** Unknown identifier, wrong password or non-user account: all look the same. */
	public static ApiException invalidCredentials() {
		return new ApiException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "The provided credentials are invalid.");
	}

	/** Only returned after the correct password was given. */
	public static ApiException verificationRequired() {
		return new ApiException(HttpStatus.FORBIDDEN, "verification_required",
				"Account verification is required. Verify your email or phone number to continue.");
	}

	/** Only returned after the correct password was given. */
	public static ApiException accountInactive() {
		return new ApiException(HttpStatus.FORBIDDEN, "account_inactive", "This account is not active.");
	}

	/**
	 * Correct password, but the user's role does not grant admin-panel access (or there is no active
	 * role). Only returned after the correct password was given.
	 */
	public static ApiException adminAccessDenied() {
		return new ApiException(HttpStatus.FORBIDDEN, "admin_access_denied",
				"You do not have permission to access the admin panel.");
	}

	public static ApiException invalidRefreshToken() {
		return new ApiException(HttpStatus.UNAUTHORIZED, "invalid_token", "The refresh token is invalid or has expired.");
	}

	public static ApiException accountExists() {
		return new ApiException(HttpStatus.CONFLICT, "account_exists",
				"An account with this email or phone number already exists.");
	}

}
