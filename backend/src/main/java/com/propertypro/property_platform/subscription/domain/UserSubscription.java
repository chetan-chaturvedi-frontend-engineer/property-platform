package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.subscription.exception.SubscriptionPlanExceptions;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/**
 * A user's subscription. The plan's terms are copied when it is created and never change
 * afterwards, so editing or deactivating the plan does not affect it.
 */
@Entity
@Table(name = "user_subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSubscription {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(name = "subscription_plan_id", nullable = false, updatable = false)
	private Long subscriptionPlanId;

	@Column(nullable = false, length = 20)
	private SubscriptionStatus status = SubscriptionStatus.PENDING;

	@Column(name = "plan_title", nullable = false, updatable = false, length = SubscriptionPlan.TITLE_MAX_LENGTH)
	private String planTitle;

	@Column(nullable = false, updatable = false, precision = 14, scale = 2)
	private BigDecimal price;

	@Column(nullable = false, updatable = false, length = 3)
	private String currency;

	@Column(name = "billing_interval", nullable = false, updatable = false, length = 20)
	private BillingInterval billingInterval;

	@Column(name = "billing_interval_count", nullable = false, updatable = false)
	private int billingIntervalCount;

	/** Property limit copied from the plan; {@code null} means unlimited. */
	@Column(name = "no_of_properties", updatable = false)
	private Integer noOfProperties;

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	/** {@code null} only for lifetime plans. */
	@Column(name = "ends_at")
	private Instant endsAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/**
	 * Pending subscription to an active plan, with the plan's current terms and one billing period
	 * from {@code startsAt}. Payment handling activates it.
	 */
	public UserSubscription(Long userId, SubscriptionPlan plan, Instant startsAt) {
		if (plan.getStatus() != SubscriptionPlanStatus.ACTIVE) {
			throw SubscriptionPlanExceptions.notAvailable();
		}
		this.userId = userId;
		this.subscriptionPlanId = plan.getId();
		this.planTitle = plan.getTitle();
		this.price = plan.getPrice();
		this.currency = plan.getCurrency();
		this.billingInterval = plan.getBillingInterval();
		this.billingIntervalCount = plan.getBillingIntervalCount();
		this.noOfProperties = plan.getNoOfProperties();
		this.startsAt = startsAt;
		this.endsAt = periodEnd(startsAt, plan.getBillingInterval(), plan.getBillingIntervalCount());
	}

	public void activate() {
		if (status != SubscriptionStatus.PENDING) {
			throw new IllegalStateException("Only pending subscriptions can be activated");
		}
		status = SubscriptionStatus.ACTIVE;
	}

	/** Calendar periods in UTC: Jan 31 + 1 month = Feb 28/29. */
	private static Instant periodEnd(Instant start, BillingInterval interval, int count) {
		ZonedDateTime utc = start.atZone(ZoneOffset.UTC);
		return switch (interval) {
			case MONTH -> utc.plusMonths(count).toInstant();
			case YEAR -> utc.plusYears(count).toInstant();
			case LIFETIME -> null;
		};
	}

}
