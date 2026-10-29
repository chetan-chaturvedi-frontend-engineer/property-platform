package com.propertypro.property_platform.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A user's preferences ({@code user_settings}), at most one row per user. The field initializers are the
 * defaults, shown to users who have never saved settings; keep them in sync with the column defaults.
 */
@Entity
@Table(name = "user_settings")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSettings {

	public static final int LOCATION_MAX_LENGTH = 150;
	public static final int LANGUAGE_MAX_LENGTH = 10;
	public static final int TIMEZONE_MAX_LENGTH = 64;
	/** BCP 47 language, optionally with a region; same as {@code chk_user_settings_language}. */
	public static final String LANGUAGE_PATTERN = "^[a-z]{2,3}(-([A-Z]{2}|[0-9]{3}))?$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotNull
	@Setter(AccessLevel.NONE)
	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Size(max = LOCATION_MAX_LENGTH)
	@Column(length = LOCATION_MAX_LENGTH)
	private String location;

	@NotNull
	@Column(nullable = false, length = 10)
	private UserTheme theme = UserTheme.SYSTEM;

	@NotNull
	@Size(max = LANGUAGE_MAX_LENGTH)
	@Pattern(regexp = LANGUAGE_PATTERN)
	@Column(nullable = false, length = LANGUAGE_MAX_LENGTH)
	private String language = "en";

	@Column(name = "notification_enabled", nullable = false)
	private boolean notificationEnabled = true;

	@Column(name = "email_notifications", nullable = false)
	private boolean emailNotifications = true;

	@Column(name = "push_notifications", nullable = false)
	private boolean pushNotifications = true;

	@Column(name = "sms_notifications", nullable = false)
	private boolean smsNotifications = false;

	/** IANA zone id; requests are checked with {@code ValidTimeZone}. */
	@NotNull
	@Size(max = TIMEZONE_MAX_LENGTH)
	@Column(nullable = false, length = TIMEZONE_MAX_LENGTH)
	private String timezone = "UTC";

	@Setter(AccessLevel.NONE)
	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Setter(AccessLevel.NONE)
	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/** Default settings of the user; not saved until persisted. */
	public UserSettings(Long userId) {
		this.userId = userId;
	}

}
