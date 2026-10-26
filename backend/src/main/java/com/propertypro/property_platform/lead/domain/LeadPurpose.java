package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** What the customer wants to do. Keep in sync with {@code chk_leads_purpose}. */
@Getter
@RequiredArgsConstructor
public enum LeadPurpose implements PersistableEnum {

	BUY("buy"),
	RENT("rent"),
	LEASE("lease"),
	SELL("sell");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "buy|rent|lease|sell";

	private final String value;

	public static LeadPurpose fromValue(String value) {
		return PersistableEnum.fromValue(LeadPurpose.class, value);
	}

}
