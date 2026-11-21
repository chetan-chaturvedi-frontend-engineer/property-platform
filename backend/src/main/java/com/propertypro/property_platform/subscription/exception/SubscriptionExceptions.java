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

	/** Builder team management without a subscription in force. Same code as {@link #subscriptionRequired()}. */
	public static ApiException teamSubscriptionRequired() {
		return new ApiException(HttpStatus.FORBIDDEN, "subscription_required",
				"An active subscription is required to manage your team.");
	}

	/** Same code as {@link #subscriptionExpired()}. */
	public static ApiException teamSubscriptionExpired() {
		return new ApiException(HttpStatus.FORBIDDEN, "subscription_expired",
				"Your subscription has expired. Renew it to manage your team.");
	}

	/** The subscription in force has a team member limit of 0. */
	public static ApiException teamManagementNotIncluded(String planTitle) {
		return new ApiException(HttpStatus.FORBIDDEN, "team_management_not_included",
				"Your plan does not include team management. Upgrade your subscription to add team members.",
				Map.of("plan", planTitle));
	}

	/** Pending and active members already use every seat. Only the requesting builder's own numbers. */
	public static ApiException teamMemberLimitReached(String planTitle, int memberLimit, long currentMembers) {
		Map<String, Object> details = new LinkedHashMap<>();
		details.put("plan", planTitle);
		details.put("teamMemberLimit", memberLimit);
		details.put("currentTeamMembers", currentMembers);
		details.put("remainingTeamMembers", Math.max(0, memberLimit - currentMembers));
		return new ApiException(HttpStatus.FORBIDDEN, "team_member_limit_reached",
				"You have reached your team member limit. Upgrade your subscription, or deactivate or remove a "
						+ "member, to add more.", details);
	}

	/** The caller has no subscription in force. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "subscription_not_found", "You have no active subscription.");
	}

	/** One subscription in force per user; taking another one is a 409, not a silent replacement. */
	public static ApiException alreadySubscribed() {
		return new ApiException(HttpStatus.CONFLICT, "subscription_already_active",
				"You already have an active subscription.");
	}

	/** A paid plan cannot be taken without payment while no payment gateway is configured. */
	public static ApiException paymentRequired() {
		return new ApiException(HttpStatus.FORBIDDEN, "payment_required",
				"This plan needs a payment, which is not available yet.");
	}

	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "subscription_action_forbidden",
				"You are not allowed to do that with your subscription.");
	}

}
