package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** The visitor's interest as judged in the visit report. Keep in sync with {@code chk_site_visits_interest}. */
@Getter
@RequiredArgsConstructor
public enum SiteVisitInterest implements PersistableEnum {

	LOW("low"),
	MEDIUM("medium"),
	HIGH("high"),
	NOT_INTERESTED("not_interested");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "low|medium|high|not_interested";

	private final String value;

	public static SiteVisitInterest fromValue(String value) {
		return PersistableEnum.fromValue(SiteVisitInterest.class, value);
	}

}
