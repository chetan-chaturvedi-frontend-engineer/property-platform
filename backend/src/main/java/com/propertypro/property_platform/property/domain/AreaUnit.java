package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Area unit. Projects accept all values; apartments only {@code sq_ft} and {@code sq_m}. */
@Getter
@RequiredArgsConstructor
public enum AreaUnit implements PersistableEnum {

	SQ_FT("sq_ft"),
	SQ_M("sq_m"),
	ACRE("acre"),
	HECTARE("hectare");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "sq_ft|sq_m|acre|hectare";

	private final String value;

	public static AreaUnit fromValue(String value) {
		return PersistableEnum.fromValue(AreaUnit.class, value);
	}

}
