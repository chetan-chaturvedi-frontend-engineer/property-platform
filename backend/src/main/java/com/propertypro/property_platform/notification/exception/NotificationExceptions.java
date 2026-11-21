package com.propertypro.property_platform.notification.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class NotificationExceptions {

	private NotificationExceptions() {
	}

	/** Unknown, deleted or someone else's: the same answer, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "notification_not_found", "Notification not found.");
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "notification_action_forbidden",
				"You are not allowed to perform this action on your notifications.");
	}

}
