package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Parking the customer needs. Keep in sync with {@code chk_leads_parking}. */
@Getter
@RequiredArgsConstructor
public enum ParkingPreference implements PersistableEnum {

	NOT_REQUIRED("not_required"),
	TWO_WHEELER("two_wheeler"),
	FOUR_WHEELER("four_wheeler"),
	BOTH("both");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "not_required|two_wheeler|four_wheeler|both";

	private final String value;

	public static ParkingPreference fromValue(String value) {
		return PersistableEnum.fromValue(ParkingPreference.class, value);
	}

}
