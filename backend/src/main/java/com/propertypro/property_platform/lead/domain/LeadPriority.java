package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Lead priority. Keep in sync with {@code chk_leads_priority}. */
@Getter
@RequiredArgsConstructor
public enum LeadPriority implements PersistableEnum {

	LOW("low"),
	MEDIUM("medium"),
	HIGH("high"),
	URGENT("urgent");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "low|medium|high|urgent";

	private final String value;

	public static LeadPriority fromValue(String value) {
		return PersistableEnum.fromValue(LeadPriority.class, value);
	}

}
