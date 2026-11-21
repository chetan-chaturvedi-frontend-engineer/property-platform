package com.propertypro.property_platform.conversation.event;

/**
 * Published inside the transaction that sends a message to someone with no unread messages in that conversation, and
 * delivered after commit so the recipient can be told once, not once per message.
 */
public record MessageSentEvent(Long conversationId, Long propertyId, String projectName, Long recipientId,
		String senderName, String preview) {
}
