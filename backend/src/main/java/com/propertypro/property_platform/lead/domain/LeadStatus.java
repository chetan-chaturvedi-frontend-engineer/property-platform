package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Sales pipeline stage of a lead. Keep in sync with {@code chk_leads_status}. */
@Getter
@RequiredArgsConstructor
public enum LeadStatus implements PersistableEnum {

	NEW("new"),
	CONTACTED("contacted"),
	INTERESTED("interested"),
	QUALIFIED("qualified"),
	SITE_VISIT_SCHEDULED("site_visit_scheduled"),
	NEGOTIATION("negotiation"),
	CONVERTED("converted"),
	LOST("lost"),
	ON_HOLD("on_hold");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "new|contacted|interested|qualified|site_visit_scheduled|negotiation|converted|lost|on_hold";

	private final String value;

	public static LeadStatus fromValue(String value) {
		return PersistableEnum.fromValue(LeadStatus.class, value);
	}

	/**
	 * The pipeline rule, kept in this one place: a converted lead is final; any other status, lost
	 * included (reopening), may move to any status. Interaction outcomes never change the status.
	 */
	public boolean canChangeTo(LeadStatus next) {
		return this == next || this != CONVERTED;
	}

}
