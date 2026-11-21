package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionStatus;
import com.propertypro.property_platform.subscription.domain.UserSubscription;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * The caller's own subscription with the terms copied from the plan when it was taken.
 * {@code noOfProperties} null means unlimited; {@code endsAt} null means lifetime.
 */
public record UserSubscriptionResponse(Long id, Long planId, String planTitle, SubscriptionStatus status,
		BigDecimal price, String currency, BillingInterval billingInterval, int billingIntervalCount,
		Integer noOfProperties, int noOfTeamMembers, Instant startsAt, Instant endsAt) {

	public static UserSubscriptionResponse from(UserSubscription s) {
		return new UserSubscriptionResponse(s.getId(), s.getSubscriptionPlanId(), s.getPlanTitle(), s.getStatus(),
				s.getPrice(), s.getCurrency(), s.getBillingInterval(), s.getBillingIntervalCount(),
				s.getNoOfProperties(), s.getNoOfTeamMembers(), s.getStartsAt(), s.getEndsAt());
	}

}
