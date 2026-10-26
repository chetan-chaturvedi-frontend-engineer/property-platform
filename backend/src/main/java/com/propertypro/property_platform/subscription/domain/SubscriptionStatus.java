package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Lifecycle of a user subscription; reaching the property limit never changes it. An
 * {@code active} subscription is only in force between its start and end. Keep in sync with
 * {@code chk_user_subscriptions_status}.
 */
@Getter
@RequiredArgsConstructor
public enum SubscriptionStatus implements PersistableEnum {

	PENDING("pending"),
	ACTIVE("active"),
	CANCELLED("cancelled"),
	EXPIRED("expired");

	private final String value;

	public static SubscriptionStatus fromValue(String value) {
		return PersistableEnum.fromValue(SubscriptionStatus.class, value);
	}

}
