package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Where the lead came from. Keep in sync with {@code chk_leads_source}. */
@Getter
@RequiredArgsConstructor
public enum LeadSource implements PersistableEnum {

	WEBSITE("website"),
	FACEBOOK("facebook"),
	INSTAGRAM("instagram"),
	REFERRAL("referral"),
	WALK_IN("walk_in"),
	PHONE_CALL("phone_call"),
	OTHER("other");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "website|facebook|instagram|referral|walk_in|phone_call|other";

	private final String value;

	public static LeadSource fromValue(String value) {
		return PersistableEnum.fromValue(LeadSource.class, value);
	}

}
