package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Administrative plan status; only {@code active} plans may be offered to users. Changing it never
 * touches existing user subscriptions. Keep in sync with {@code chk_subscription_plans_status}.
 */
@Getter
@RequiredArgsConstructor
public enum SubscriptionPlanStatus implements PersistableEnum {

	DRAFT("draft"),
	ACTIVE("active"),
	INACTIVE("inactive");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "draft|active|inactive";

	private final String value;

	public static SubscriptionPlanStatus fromValue(String value) {
		return PersistableEnum.fromValue(SubscriptionPlanStatus.class, value);
	}

}
