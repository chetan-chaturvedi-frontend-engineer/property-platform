package com.propertypro.property_platform.notification.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * What a notification is about. Stored as the lowercase {@link #getValue() value}; keep in sync with
 * {@code chk_notifications_type}.
 */
@Getter
@RequiredArgsConstructor
public enum NotificationType implements PersistableEnum {

	SITE_VISIT_BOOKED("site_visit_booked"),
	PROPERTY_STATUS_CHANGED("property_status_changed"),
	NEW_MESSAGE("new_message");

	private final String value;

	public static NotificationType fromValue(String value) {
		return PersistableEnum.fromValue(NotificationType.class, value);
	}

}
