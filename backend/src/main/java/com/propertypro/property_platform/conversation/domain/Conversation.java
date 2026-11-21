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

/**
 * A buyer's enquiry thread with the owner of one property ({@code conversations}). Exactly two people take part,
 * and everything else about it is checked against them. Read state is the highest message id each side has seen.
 */
@Entity
@Table(name = "conversations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Conversation {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "property_id", nullable = false, updatable = false)
	private Long propertyId;

	@Column(name = "buyer_id", nullable = false, updatable = false)
	private Long buyerId;

	/** The property's owner when the conversation started. */
	@Column(name = "seller_id", nullable = false, updatable = false)
	private Long sellerId;

	@Column(name = "last_message_at", nullable = false)
	private Instant lastMessageAt;

	@Column(name = "buyer_last_read_message_id", nullable = false)
	private long buyerLastReadMessageId;

	@Column(name = "seller_last_read_message_id", nullable = false)
	private long sellerLastReadMessageId;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public Conversation(Long propertyId, Long buyerId, Long sellerId, Instant now) {
		this.propertyId = propertyId;
		this.buyerId = buyerId;
		this.sellerId = sellerId;
		this.lastMessageAt = now;
	}

	public boolean isParticipant(Long userId) {
		return buyerId.equals(userId) || sellerId.equals(userId);
	}

	public Long otherPartyOf(Long userId) {
		return buyerId.equals(userId) ? sellerId : buyerId;
	}

	public boolean isBuyer(Long userId) {
		return buyerId.equals(userId);
	}

	public void touch(Instant at) {
		this.lastMessageAt = at;
	}

	/** Moves the user's read marker forward; it never moves back, so a stale request cannot unread messages. */
	public void markRead(Long userId, long messageId) {
		if (buyerId.equals(userId)) {
			buyerLastReadMessageId = Math.max(buyerLastReadMessageId, messageId);
		}
		else if (sellerId.equals(userId)) {
			sellerLastReadMessageId = Math.max(sellerLastReadMessageId, messageId);
		}
	}

	public long lastReadMessageIdOf(Long userId) {
		return buyerId.equals(userId) ? buyerLastReadMessageId : sellerLastReadMessageId;
	}

}
