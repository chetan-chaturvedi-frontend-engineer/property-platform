package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.CURRENCY_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.DESCRIPTION_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.FEATURE_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.ICON_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.ICON_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_BILLING_INTERVAL_COUNT;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_FEATURES;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_PROPERTIES;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_SORT_ORDER;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_TRIAL_DAYS;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.PHOTO_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.PHOTO_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.SLUG_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.SLUG_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.TITLE_MAX_LENGTH;

/**
 * New plan. Omitted optional fields take the column defaults; {@code slug} is generated from the
 * title when omitted. {@code noOfProperties} omitted or null means unlimited.
 */
public record CreateSubscriptionPlanRequest(
		@Size(max = ICON_MAX_LENGTH) @Pattern(regexp = ICON_PATTERN, message = "must be an icon identifier") String icon,
		@Size(max = PHOTO_MAX_LENGTH)
		@Pattern(regexp = PHOTO_PATTERN, message = "must be a storage key or an https URL") String photo,
		@NotBlank @Size(max = TITLE_MAX_LENGTH) String title,
		@Size(max = SLUG_MAX_LENGTH)
		@Pattern(regexp = SLUG_PATTERN, message = "must be lowercase letters and digits separated by hyphens") String slug,
		@NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal price,
		@Pattern(regexp = CURRENCY_PATTERN, message = "must be a 3-letter ISO 4217 code") String currency,
		@Pattern(regexp = BillingInterval.VALUES, message = "must be month, year or lifetime") String billingInterval,
		@Min(1) @Max(MAX_BILLING_INTERVAL_COUNT) Integer billingIntervalCount,
		@Size(max = DESCRIPTION_MAX_LENGTH) String description,
		@Min(0) @Max(MAX_PROPERTIES) Integer noOfProperties,
		@Size(max = MAX_FEATURES) List<@NotBlank @Size(max = FEATURE_MAX_LENGTH) String> features,
		@Pattern(regexp = SubscriptionPlanStatus.VALUES, message = "must be draft, active or inactive") String status,
		Boolean popular,
		@Min(0) @Max(MAX_SORT_ORDER) Integer sortOrder,
		@Min(0) @Max(MAX_TRIAL_DAYS) Integer trialDays) {
}
