package com.propertypro.property_platform.user.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class UserStatusConverter extends PersistableEnumConverter<UserStatus> {

	public UserStatusConverter() {
		super(UserStatus.class);
	}

}
