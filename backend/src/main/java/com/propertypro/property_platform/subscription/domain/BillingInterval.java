package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Billing unit of a plan, combined with its interval count (3 x {@code month} = quarterly).
 * Keep in sync with {@code chk_subscription_plans_billing_interval}.
 */
@Getter
@RequiredArgsConstructor
public enum BillingInterval implements PersistableEnum {

	MONTH("month"),
	YEAR("year"),
	/** One-time charge; the interval count is always 1. */
	LIFETIME("lifetime");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "month|year|lifetime";

	private final String value;

	public static BillingInterval fromValue(String value) {
		return PersistableEnum.fromValue(BillingInterval.class, value);
	}

}
