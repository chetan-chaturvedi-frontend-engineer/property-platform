package com.propertypro.property_platform.savedproperty.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class SavedPropertyExceptions {

	private SavedPropertyExceptions() {
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "saved_property_action_forbidden",
				"You are not allowed to perform this action on your saved properties.");
	}

}
