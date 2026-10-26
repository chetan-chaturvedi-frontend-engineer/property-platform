package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.common.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserSubscriptionTests {

	private static final Instant JAN_31 = Instant.parse("2026-01-31T10:00:00Z");

	@Test
	void copiesThePlanTermsAndStartsPending() {
		SubscriptionPlan plan = plan(BillingInterval.YEAR, 1);
		plan.setNoOfProperties(7);
		plan.setCurrency("USD");

		UserSubscription subscription = new UserSubscription(42L, plan, JAN_31);

		assertThat(subscription.getUserId()).isEqualTo(42L);
		assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.PENDING);
		assertThat(subscription.getPlanTitle()).isEqualTo("Gold");
		assertThat(subscription.getPrice()).isEqualByComparingTo("999.00");
		assertThat(subscription.getCurrency()).isEqualTo("USD");
		assertThat(subscription.getNoOfProperties()).isEqualTo(7);
		assertThat(subscription.getEndsAt()).isEqualTo(Instant.parse("2027-01-31T10:00:00Z"));
	}

	@Test
	void periodFollowsTheBillingInterval() {
		assertThat(new UserSubscription(1L, plan(BillingInterval.MONTH, 1), JAN_31).getEndsAt())
			.isEqualTo(Instant.parse("2026-02-28T10:00:00Z"));
		assertThat(new UserSubscription(1L, plan(BillingInterval.MONTH, 3), JAN_31).getEndsAt())
			.isEqualTo(Instant.parse("2026-04-30T10:00:00Z"));
		assertThat(new UserSubscription(1L, plan(BillingInterval.LIFETIME, 1), JAN_31).getEndsAt()).isNull();
	}

	@Test
	void onlyActivePlansAcceptNewSubscriptions() {
		for (SubscriptionPlanStatus status : new SubscriptionPlanStatus[] { SubscriptionPlanStatus.DRAFT,
				SubscriptionPlanStatus.INACTIVE }) {
			SubscriptionPlan plan = plan(BillingInterval.MONTH, 1);
			plan.setStatus(status);

			assertThatThrownBy(() -> new UserSubscription(1L, plan, JAN_31))
				.isInstanceOfSatisfying(ApiException.class,
						ex -> assertThat(ex.getCode()).isEqualTo("subscription_plan_unavailable"));
		}
	}

	@Test
	void onlyPendingSubscriptionsCanBeActivated() {
		UserSubscription subscription = new UserSubscription(1L, plan(BillingInterval.MONTH, 1), JAN_31);
		subscription.activate();

		assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
		assertThatThrownBy(subscription::activate).isInstanceOf(IllegalStateException.class);
	}

	private static SubscriptionPlan plan(BillingInterval interval, int count) {
		SubscriptionPlan plan = new SubscriptionPlan("Gold", "gold", new BigDecimal("999"));
		plan.setBillingInterval(interval);
		plan.setBillingIntervalCount(count);
		plan.setStatus(SubscriptionPlanStatus.ACTIVE);
		return plan;
	}

}
