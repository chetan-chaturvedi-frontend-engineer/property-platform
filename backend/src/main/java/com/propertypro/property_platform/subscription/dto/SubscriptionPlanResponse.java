package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Admin view of a plan: every field, all statuses. {@code noOfProperties} null means unlimited. */
public record SubscriptionPlanResponse(Long id, String icon, String photo, String title, String slug,
		BigDecimal price, String currency, BillingInterval billingInterval, int billingIntervalCount,
		String description, Integer noOfProperties, List<String> features, SubscriptionPlanStatus status,
		boolean popular, int sortOrder, int trialDays, Instant createdAt, Instant updatedAt) {

	public static SubscriptionPlanResponse from(SubscriptionPlan plan) {
		return new SubscriptionPlanResponse(plan.getId(), plan.getIcon(), plan.getPhoto(), plan.getTitle(),
				plan.getSlug(), plan.getPrice(), plan.getCurrency(), plan.getBillingInterval(),
				plan.getBillingIntervalCount(), plan.getDescription(), plan.getNoOfProperties(),
				List.copyOf(plan.getFeatures()), plan.getStatus(), plan.isPopular(), plan.getSortOrder(),
				plan.getTrialDays(), plan.getCreatedAt(), plan.getUpdatedAt());
	}

}
