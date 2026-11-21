package com.propertypro.property_platform.notification.dto;

import com.propertypro.property_platform.notification.domain.Notification;
import com.propertypro.property_platform.notification.domain.NotificationType;

import java.time.Instant;
import java.util.Map;

/** One notification as its owner sees it; {@code data} holds ids for deep links, never personal details. */
public record NotificationResponse(Long id, NotificationType type, String title, String body,
		Map<String, Object> data, boolean read, Instant createdAt) {

	public static NotificationResponse from(Notification n) {
		return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getData(),
				n.getReadAt() != null, n.getCreatedAt());
	}

}
