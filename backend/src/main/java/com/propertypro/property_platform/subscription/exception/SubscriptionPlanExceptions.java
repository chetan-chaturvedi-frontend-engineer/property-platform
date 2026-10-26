package com.propertypro.property_platform.subscription.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class SubscriptionPlanExceptions {

	private SubscriptionPlanExceptions() {
	}

	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "subscription_plan_not_found", "Subscription plan not found.");
	}

	/** New subscriptions are only possible to active plans; existing ones are not affected. */
	public static ApiException notAvailable() {
		return new ApiException(HttpStatus.CONFLICT, "subscription_plan_unavailable",
				"This subscription plan is not available for new subscriptions.");
	}

	public static ApiException slugTaken() {
		return new ApiException(HttpStatus.CONFLICT, "subscription_plan_slug_taken",
				"Another subscription plan already uses this slug.");
	}

}
