package com.propertypro.property_platform.propertyview.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class PropertyViewExceptions {

	private PropertyViewExceptions() {
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "recently_viewed_action_forbidden",
				"You are not allowed to perform this action on your recently viewed properties.");
	}

}
