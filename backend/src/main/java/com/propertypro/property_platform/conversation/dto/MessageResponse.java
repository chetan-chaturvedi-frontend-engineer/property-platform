package com.propertypro.property_platform.conversation.dto;

import com.propertypro.property_platform.conversation.domain.Message;

import java.time.Instant;

/** {@code mine} says who sent it from the caller's point of view; sender ids are never exposed. */
public record MessageResponse(Long id, Long conversationId, boolean mine, String body, Instant createdAt) {

	public static MessageResponse from(Message m, Long viewerId) {
		return new MessageResponse(m.getId(), m.getConversationId(), m.getSenderId().equals(viewerId), m.getBody(),
				m.getCreatedAt());
	}

}
