package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Keep in sync with {@code chk_site_visits_visit_type}. */
@Getter
@RequiredArgsConstructor
public enum SiteVisitType implements PersistableEnum {

	SITE_VISIT("site_visit"),
	VIRTUAL_VISIT("virtual_visit"),
	REVISIT("revisit");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "site_visit|virtual_visit|revisit";

	private final String value;

	public static SiteVisitType fromValue(String value) {
		return PersistableEnum.fromValue(SiteVisitType.class, value);
	}

}
