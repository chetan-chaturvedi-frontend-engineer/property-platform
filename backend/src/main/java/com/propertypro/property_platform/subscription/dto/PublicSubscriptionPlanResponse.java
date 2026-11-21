package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;

import java.math.BigDecimal;
import java.util.List;

/**
 * An active plan for the public plan list. Leaves out the status and audit fields.
 * {@code noOfProperties} null means unlimited; {@code noOfTeamMembers} 0 means team management is not included.
 */
public record PublicSubscriptionPlanResponse(Long id, String icon, String title, String slug, BigDecimal price,
		String currency, BillingInterval billingInterval, int billingIntervalCount, String description,
		Integer noOfProperties, int noOfTeamMembers, List<String> features, boolean popular, int trialDays) {

	public static PublicSubscriptionPlanResponse from(SubscriptionPlan plan) {
		return new PublicSubscriptionPlanResponse(plan.getId(), plan.getIcon(), plan.getTitle(), plan.getSlug(),
				plan.getPrice(), plan.getCurrency(), plan.getBillingInterval(), plan.getBillingIntervalCount(),
				plan.getDescription(), plan.getNoOfProperties(), plan.getNoOfTeamMembers(),
				List.copyOf(plan.getFeatures()), plan.isPopular(), plan.getTrialDays());
	}

}
