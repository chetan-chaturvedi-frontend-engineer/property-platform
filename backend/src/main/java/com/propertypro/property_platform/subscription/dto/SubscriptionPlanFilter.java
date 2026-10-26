package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Optional list filters from query parameters; all given filters must match. {@code search} matches
 * title or slug case-insensitively; price and creation-time bounds are inclusive.
 */
public record SubscriptionPlanFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = SubscriptionPlanStatus.VALUES, message = "must be draft, active or inactive") String status,
		@Pattern(regexp = BillingInterval.VALUES, message = "must be month, year or lifetime") String billingInterval,
		Boolean popular,
		@DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal minPrice,
		@DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal maxPrice,
		Instant createdFrom,
		Instant createdTo) {
}
