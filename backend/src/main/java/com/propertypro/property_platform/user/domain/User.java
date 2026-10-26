package com.propertypro.property_platform.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")
// Deletes set deleted_at instead of removing the row; queries skip soft-deleted users.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

	/** Role slug of self-registered app users. */
	public static final String DEFAULT_USER_TYPE = "user";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String email;

	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Column(name = "full_name", nullable = false, length = 150)
	private String fullName;

	/** E.164 format, e.g. +919876543210. */
	@Column(length = 16)
	private String phone;

	@Column(nullable = false, length = 20)
	private UserStatus status = UserStatus.PENDING;

	/**
	 * Slug of the user's role ({@code roles.slug}). Access always comes from that role's permissions,
	 * never from this value; a slug without an active role grants nothing.
	 */
	@Column(name = "user_type", nullable = false, length = 30)
	private String userType = DEFAULT_USER_TYPE;

	@Column(name = "email_verified")
	private Instant emailVerifiedAt;

	@Column(name = "phone_verified")
	private Instant phoneVerifiedAt;

	// Document storage keys (never document contents). Do not expose in public API responses.
	@Column(name = "aadhar_card", length = 512)
	private String aadharCard;

	@Column(name = "pan_card", length = 512)
	private String panCard;

	@Column(name = "rera_certificate", length = 512)
	private String reraCertificate;

	@Column(name = "gst_certificate", length = 512)
	private String gstCertificate;

	@Column(name = "business_address_proof", length = 512)
	private String businessAddressProof;

	@Column(name = "driving_license", length = 512)
	private String drivingLicense;

	@Column(name = "company_registration", length = 512)
	private String companyRegistration;

	@Column(name = "moa_aoa", length = 512)
	private String moaAoa;

	@Column(name = "notification_token", length = 512)
	private String notificationToken;

	@Column(name = "notification_status", nullable = false)
	private boolean notificationsEnabled = true;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at")
	private Instant updatedAt;

	/** New self-registered account: always {@code user} type and {@code pending} until verified. */
	public User(String email, String phone, String passwordHash, String fullName) {
		this.email = email;
		this.phone = phone;
		this.passwordHash = passwordHash;
		this.fullName = fullName;
	}

	public boolean isEmailVerified() {
		return emailVerifiedAt != null;
	}

	public boolean isPhoneVerified() {
		return phoneVerifiedAt != null;
	}

	public void markEmailVerified(Instant now) {
		if (emailVerifiedAt == null) {
			emailVerifiedAt = now;
		}
	}

	public void markPhoneVerified(Instant now) {
		if (phoneVerifiedAt == null) {
			phoneVerifiedAt = now;
		}
	}

	/** Verification activates only pending accounts; blocked or closed accounts stay as they are. */
	public void activateIfPending() {
		if (status == UserStatus.PENDING && (isEmailVerified() || isPhoneVerified())) {
			status = UserStatus.ACTIVE;
		}
	}

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

}
