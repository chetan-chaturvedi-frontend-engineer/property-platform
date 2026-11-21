package com.propertypro.property_platform.user.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class UserProfileExceptions {

	private UserProfileExceptions() {
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "profile_action_forbidden",
				"You are not allowed to perform this action on your account.");
	}

	/** The current password was wrong; never says anything else about the account. */
	public static ApiException passwordIncorrect() {
		return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "password_incorrect", "The password is incorrect.");
	}

	public static ApiException samePassword() {
		return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "password_unchanged",
				"The new password must be different from the current one.");
	}

}
