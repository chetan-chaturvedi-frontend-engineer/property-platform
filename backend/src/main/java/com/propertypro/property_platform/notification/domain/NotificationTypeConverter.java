package com.propertypro.property_platform.notification.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class NotificationTypeConverter extends PersistableEnumConverter<NotificationType> {

	public NotificationTypeConverter() {
		super(NotificationType.class);
	}

}
