package com.propertypro.property_platform.user.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** UI theme preference. Keep in sync with {@code chk_user_settings_theme}. */
@Getter
@RequiredArgsConstructor
public enum UserTheme implements PersistableEnum {

	LIGHT("light"),
	DARK("dark"),
	/** Follow the device setting. */
	SYSTEM("system");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "light|dark|system";

	private final String value;

	public static UserTheme fromValue(String value) {
		return PersistableEnum.fromValue(UserTheme.class, value);
	}

}
