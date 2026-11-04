package com.propertypro.property_platform.activitylog.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class SystemLogExceptions {

	private SystemLogExceptions() {
	}

	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "system_log_not_found", "System log not found.");
	}

}
