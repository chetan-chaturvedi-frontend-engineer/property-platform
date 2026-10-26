package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Keep in sync with {@code chk_property_project_media_media_type}. */
@Getter
@RequiredArgsConstructor
public enum ProjectMediaType implements PersistableEnum {

	PHOTO("photo"),
	VIDEO("video"),
	BROCHURE("brochure");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "photo|video|brochure";

	private final String value;

	public static ProjectMediaType fromValue(String value) {
		return PersistableEnum.fromValue(ProjectMediaType.class, value);
	}

}
