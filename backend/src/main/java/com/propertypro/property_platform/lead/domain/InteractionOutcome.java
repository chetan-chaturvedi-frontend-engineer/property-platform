package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Result of an interaction. Keep in sync with {@code chk_lead_interactions_outcome}. */
@Getter
@RequiredArgsConstructor
public enum InteractionOutcome implements PersistableEnum {

	INTERESTED("interested"),
	NOT_INTERESTED("not_interested"),
	NO_ANSWER("no_answer"),
	FOLLOW_UP_REQUIRED("follow_up_required"),
	SITE_VISIT_PLANNED("site_visit_planned"),
	NEGOTIATION("negotiation"),
	CONVERTED("converted"),
	OTHER("other");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "interested|not_interested|no_answer|follow_up_required|site_visit_planned|negotiation|converted|other";

	private final String value;

	public static InteractionOutcome fromValue(String value) {
		return PersistableEnum.fromValue(InteractionOutcome.class, value);
	}

}
