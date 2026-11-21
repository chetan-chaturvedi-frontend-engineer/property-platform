package com.propertypro.property_platform.conversation.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class ConversationExceptions {

	private ConversationExceptions() {
	}

	/** Unknown or not a participant: the same answer, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "conversation_not_found", "Conversation not found.");
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "conversation_action_forbidden",
				"You are not allowed to perform this action on conversations.");
	}

}
