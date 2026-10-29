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
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.CURRENCY_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.DESCRIPTION_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.FEATURE_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.ICON_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.ICON_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_BILLING_INTERVAL_COUNT;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_FEATURES;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_PROPERTIES;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_SORT_ORDER;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_TEAM_MEMBERS;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.MAX_TRIAL_DAYS;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.PHOTO_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.PHOTO_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.SLUG_MAX_LENGTH;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.SLUG_PATTERN;
import static com.propertypro.property_platform.subscription.domain.SubscriptionPlan.TITLE_MAX_LENGTH;

/**
 * Partial update (PATCH), same rules as {@link CreateSubscriptionPlanRequest}. Per field: omitted
 * ({@code null} here) keeps the current value; an explicit JSON {@code null} ({@code Optional.empty()})
 * clears icon, photo, description and noOfProperties (= unlimited) and is rejected for the others.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON,
 * whereas a record constructor receives {@code Optional.empty()} for omitted ones too.
 */
@Getter
@Setter
public class UpdateSubscriptionPlanRequest {

	private Optional<@Size(max = ICON_MAX_LENGTH)
			@Pattern(regexp = ICON_PATTERN, message = "must be an icon identifier") String> icon;

	private Optional<@Size(max = PHOTO_MAX_LENGTH)
			@Pattern(regexp = PHOTO_PATTERN, message = "must be a storage key or an https URL") String> photo;

	private Optional<@NotBlank @Size(max = TITLE_MAX_LENGTH) String> title;

	private Optional<@NotNull @Size(max = SLUG_MAX_LENGTH)
			@Pattern(regexp = SLUG_PATTERN, message = "must be lowercase letters and digits separated by hyphens") String> slug;

	private Optional<@NotNull @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal> price;

	private Optional<@NotNull
			@Pattern(regexp = CURRENCY_PATTERN, message = "must be a 3-letter ISO 4217 code") String> currency;

	private Optional<@NotNull
			@Pattern(regexp = BillingInterval.VALUES, message = "must be month, year or lifetime") String> billingInterval;

	private Optional<@NotNull @Min(1) @Max(MAX_BILLING_INTERVAL_COUNT) Integer> billingIntervalCount;

	private Optional<@Size(max = DESCRIPTION_MAX_LENGTH) String> description;

	private Optional<@Min(0) @Max(MAX_PROPERTIES) Integer> noOfProperties;

	private Optional<@NotNull @Min(0) @Max(MAX_TEAM_MEMBERS) Integer> noOfTeamMembers;

	private Optional<@NotNull @Size(max = MAX_FEATURES)
			List<@NotBlank @Size(max = FEATURE_MAX_LENGTH) String>> features;

	private Optional<@NotNull
			@Pattern(regexp = SubscriptionPlanStatus.VALUES, message = "must be draft, active or inactive") String> status;

	private Optional<@NotNull Boolean> popular;

	private Optional<@NotNull @Min(0) @Max(MAX_SORT_ORDER) Integer> sortOrder;

	private Optional<@NotNull @Min(0) @Max(MAX_TRIAL_DAYS) Integer> trialDays;

}
