package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Preferred furnishing. Keep in sync with {@code chk_leads_furnishing}. */
@Getter
@RequiredArgsConstructor
public enum Furnishing implements PersistableEnum {

	FURNISHED("furnished"),
	SEMI_FURNISHED("semi_furnished"),
	UNFURNISHED("unfurnished");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "furnished|semi_furnished|unfurnished";

	private final String value;

	public static Furnishing fromValue(String value) {
		return PersistableEnum.fromValue(Furnishing.class, value);
	}

}
