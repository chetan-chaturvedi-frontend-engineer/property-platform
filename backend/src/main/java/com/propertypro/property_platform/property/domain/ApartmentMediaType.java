package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Keep in sync with {@code chk_property_apartment_media_media_type}. */
@Getter
@RequiredArgsConstructor
public enum ApartmentMediaType implements PersistableEnum {

	FLOOR_PLAN_IMAGE("floor_plan_image"),
	PLAN_PDF("plan_pdf"),
	PHOTO("photo");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "floor_plan_image|plan_pdf|photo";

	private final String value;

	public static ApartmentMediaType fromValue(String value) {
		return PersistableEnum.fromValue(ApartmentMediaType.class, value);
	}

}
