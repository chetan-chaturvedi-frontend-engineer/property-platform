package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Legal approval decided by administrators. Keep in sync with {@code chk_property_projects_legal_approval_status}. */
@Getter
@RequiredArgsConstructor
public enum LegalApprovalStatus implements PersistableEnum {

	PENDING("pending"),
	APPROVED("approved"),
	REJECTED("rejected"),
	NOT_APPLICABLE("not_applicable");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "pending|approved|rejected|not_applicable";

	private final String value;

	public static LegalApprovalStatus fromValue(String value) {
		return PersistableEnum.fromValue(LegalApprovalStatus.class, value);
	}

}
