package com.propertypro.property_platform.user.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class UserSettingsExceptions {

	private UserSettingsExceptions() {
	}

	/** The caller has not created their settings yet. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "user_settings_not_found",
				"You have not created your settings yet.");
	}

	public static ApiException alreadyExists() {
		return new ApiException(HttpStatus.CONFLICT, "user_settings_already_exist",
				"Your settings already exist. Update them instead.");
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "user_settings_action_forbidden",
				"You are not allowed to perform this action on your settings.");
	}

}
