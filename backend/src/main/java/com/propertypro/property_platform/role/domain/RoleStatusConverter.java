package com.propertypro.property_platform.role.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleStatusConverter extends PersistableEnumConverter<RoleStatus> {

	public RoleStatusConverter() {
		super(RoleStatus.class);
	}

}
