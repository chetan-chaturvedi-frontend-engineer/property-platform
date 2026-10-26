package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Property type a lead is looking for; broader than the listing {@code PropertyType}. Keep in sync with {@code chk_leads_property_type}. */
@Getter
@RequiredArgsConstructor
public enum LeadPropertyType implements PersistableEnum {

	APARTMENT("apartment"),
	FLAT("flat"),
	VILLA("villa"),
	INDEPENDENT_HOUSE("independent_house"),
	PLOT("plot"),
	COMMERCIAL("commercial"),
	OFFICE("office"),
	SHOP("shop"),
	OTHER("other");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "apartment|flat|villa|independent_house|plot|commercial|office|shop|other";

	private final String value;

	public static LeadPropertyType fromValue(String value) {
		return PersistableEnum.fromValue(LeadPropertyType.class, value);
	}

}
