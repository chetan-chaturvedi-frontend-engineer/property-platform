package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Channel of an interaction. Keep in sync with {@code chk_lead_interactions_type}. */
@Getter
@RequiredArgsConstructor
public enum InteractionType implements PersistableEnum {

	CALL("call"),
	WHATSAPP("whatsapp"),
	EMAIL("email"),
	SMS("sms"),
	MEETING("meeting"),
	SITE_VISIT("site_visit"),
	NOTE("note"),
	OTHER("other");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "call|whatsapp|email|sms|meeting|site_visit|note|other";

	private final String value;

	public static InteractionType fromValue(String value) {
		return PersistableEnum.fromValue(InteractionType.class, value);
	}

}
