package com.propertypro.property_platform.subscription.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.Map;

/** Subscription gating errors: always 403, each state with its own code. */
public final class SubscriptionExceptions {

	private SubscriptionExceptions() {
	}

	/** No subscription in force: none, pending, cancelled or not started yet. */
	public static ApiException subscriptionRequired() {
		return new ApiException(HttpStatus.FORBIDDEN, "subscription_required",
				"An active subscription is required to add properties.");
	}

	/** The last subscription in force ran past its end date. */
	public static ApiException subscriptionExpired() {
		return new ApiException(HttpStatus.FORBIDDEN, "subscription_expired",
				"Your subscription has expired. Renew it to add more properties.");
	}

	/** Subscription in force, but its property limit is used up. Only the requesting user's own numbers. */
	public static ApiException propertyLimitReached(String planTitle, int propertyLimit, long currentProperties) {
		Map<String, Object> details = new LinkedHashMap<>();
		details.put("plan", planTitle);
		details.put("propertyLimit", propertyLimit);
		details.put("currentProperties", currentProperties);
		details.put("remainingProperties", Math.max(0, propertyLimit - currentProperties));
		return new ApiException(HttpStatus.FORBIDDEN, "property_limit_reached",
				"You have reached your property limit. Upgrade your subscription to add more properties.", details);
	}

}
