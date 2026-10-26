package com.propertypro.property_platform.user.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Account lifecycle status, independent of email, phone and document verification.
 * Stored as the lowercase {@link #getValue() value}; keep in sync with {@code chk_users_status}.
 */
@Getter
@RequiredArgsConstructor
public enum UserStatus implements PersistableEnum {

	PENDING("pending"),
	ACTIVE("active"),
	SUSPENDED("suspended"),
	REJECTED("rejected"),
	INACTIVE("inactive"),
	CLOSED("closed");

	private final String value;

	public static UserStatus fromValue(String value) {
		return PersistableEnum.fromValue(UserStatus.class, value);
	}

}
