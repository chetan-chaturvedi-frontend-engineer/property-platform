package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.user.domain.UserSettings;
import com.propertypro.property_platform.user.domain.UserTheme;

import java.time.Instant;

/** The caller's settings. The owner is implicit (always the caller), so {@code userId} is not returned. */
public record UserSettingsResponse(Long id, String location, UserTheme theme, String language,
		boolean notificationEnabled, boolean emailNotifications, boolean pushNotifications, boolean smsNotifications,
		String timezone, Instant createdAt, Instant updatedAt) {

	public static UserSettingsResponse from(UserSettings settings) {
		return new UserSettingsResponse(settings.getId(), settings.getLocation(), settings.getTheme(),
				settings.getLanguage(), settings.isNotificationEnabled(), settings.isEmailNotifications(),
				settings.isPushNotifications(), settings.isSmsNotifications(), settings.getTimezone(),
				settings.getCreatedAt(), settings.getUpdatedAt());
	}

}
