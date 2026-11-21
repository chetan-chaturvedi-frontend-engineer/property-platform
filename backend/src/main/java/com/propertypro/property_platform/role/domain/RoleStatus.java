package com.propertypro.property_platform.role.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Only {@code active} roles grant permissions. Keep in sync with {@code chk_roles_status}.
 */
@Getter
@RequiredArgsConstructor
public enum RoleStatus implements PersistableEnum {

	ACTIVE("active"),
	INACTIVE("inactive");

	/** Every value, for request validation. */
	public static final String VALUES = "active|inactive";

	private final String value;

	public static RoleStatus fromValue(String value) {
		return PersistableEnum.fromValue(RoleStatus.class, value);
	}

}
