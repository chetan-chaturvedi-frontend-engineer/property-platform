package com.propertypro.property_platform.activitylog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SystemLogLevelConverter extends PersistableEnumConverter<SystemLogLevel> {

	public SystemLogLevelConverter() {
		super(SystemLogLevel.class);
	}

}
