package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Kind of project. Keep in sync with {@code chk_property_projects_property_type}. */
@Getter
@RequiredArgsConstructor
public enum PropertyType implements PersistableEnum {

	APARTMENT("apartment"),
	VILLA("villa"),
	COMMERCIAL("commercial");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "apartment|villa|commercial";

	private final String value;

	public static PropertyType fromValue(String value) {
		return PersistableEnum.fromValue(PropertyType.class, value);
	}

}
