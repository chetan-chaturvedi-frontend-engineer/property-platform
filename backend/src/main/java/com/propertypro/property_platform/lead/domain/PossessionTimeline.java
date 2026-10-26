package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** When the customer needs possession. Keep in sync with {@code chk_leads_possession}. */
@Getter
@RequiredArgsConstructor
public enum PossessionTimeline implements PersistableEnum {

	READY_TO_MOVE("ready_to_move"),
	WITHIN_3_MONTHS("within_3_months"),
	WITHIN_6_MONTHS("within_6_months"),
	WITHIN_1_YEAR("within_1_year"),
	AFTER_1_YEAR("after_1_year"),
	FLEXIBLE("flexible");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "ready_to_move|within_3_months|within_6_months|within_1_year|after_1_year|flexible";

	private final String value;

	public static PossessionTimeline fromValue(String value) {
		return PersistableEnum.fromValue(PossessionTimeline.class, value);
	}

}
