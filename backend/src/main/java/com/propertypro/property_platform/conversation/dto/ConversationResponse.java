package com.propertypro.property_platform.conversation.dto;

import java.time.Instant;

/**
 * A conversation in the caller's inbox. {@code role} is the caller's side: {@code buyer} (asked about the property)
 * or {@code seller} (owns it). The other party is only {id, fullName}, never contact details.
 */
public record ConversationResponse(Long id, PropertyInfo property, Party otherParty, String role,
		LastMessage lastMessage, long unread, Instant lastMessageAt) {

	public record PropertyInfo(Long id, String projectName, String slug) {
	}

	public record Party(Long id, String fullName) {
	}

	public record LastMessage(Long id, String body, boolean mine, Instant createdAt) {
	}

}
