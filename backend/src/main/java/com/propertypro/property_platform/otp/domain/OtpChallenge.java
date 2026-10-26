package com.propertypro.property_platform.otp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * One issued code. State changes (attempts, consumption, invalidation, delivery status) happen
 * through atomic repository updates, never by mutating a loaded entity.
 */
@Entity
@Table(name = "otp_challenges")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OtpChallenge {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(nullable = false, updatable = false, length = 30)
	private OtpPurpose purpose;

	@Column(nullable = false, updatable = false, length = 10)
	private OtpChannel channel;

	@Column(nullable = false, updatable = false)
	private String destination;

	@Column(name = "otp_hash", nullable = false, updatable = false, length = 64)
	private String otpHash;

	@Column(name = "expires_at", nullable = false, updatable = false)
	private Instant expiresAt;

	@Column(name = "attempt_count", nullable = false)
	private int attemptCount;

	@Column(name = "delivery_status", nullable = false, length = 20)
	private OtpDeliveryStatus deliveryStatus = OtpDeliveryStatus.PENDING;

	@Column(name = "delivery_attempts", nullable = false)
	private int deliveryAttempts;

	@Column(name = "consumed_at")
	private Instant consumedAt;

	@Column(name = "invalidated_at")
	private Instant invalidatedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public OtpChallenge(Long userId, OtpPurpose purpose, OtpChannel channel, String destination, String otpHash,
			Instant expiresAt, Instant createdAt) {
		this.userId = userId;
		this.purpose = purpose;
		this.channel = channel;
		this.destination = destination;
		this.otpHash = otpHash;
		this.expiresAt = expiresAt;
		this.createdAt = createdAt;
	}

}
