package com.propertypro.property_platform.conversation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** One text message of a conversation ({@code messages}). Messages are never edited or deleted. */
@Entity
@Table(name = "messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {

	public static final int BODY_MAX_LENGTH = 2000;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "conversation_id", nullable = false, updatable = false)
	private Long conversationId;

	@Column(name = "sender_id", nullable = false, updatable = false)
	private Long senderId;

	@Column(nullable = false, updatable = false, length = BODY_MAX_LENGTH)
	private String body;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public Message(Long conversationId, Long senderId, String body) {
		this.conversationId = conversationId;
		this.senderId = senderId;
		this.body = body;
	}

}
