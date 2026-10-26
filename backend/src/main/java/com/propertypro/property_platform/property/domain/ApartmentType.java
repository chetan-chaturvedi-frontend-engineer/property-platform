package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Apartment configuration type. Keep in sync with {@code chk_property_apartments_apartment_type}. */
@Getter
@RequiredArgsConstructor
public enum ApartmentType implements PersistableEnum {

	ONE_BHK("1bhk"),
	TWO_BHK("2bhk"),
	THREE_BHK("3bhk"),
	FOUR_BHK("4bhk"),
	PENTHOUSE("penthouse");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "1bhk|2bhk|3bhk|4bhk|penthouse";

	private final String value;

	public static ApartmentType fromValue(String value) {
		return PersistableEnum.fromValue(ApartmentType.class, value);
	}

}
