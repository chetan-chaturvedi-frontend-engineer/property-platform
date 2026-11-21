package com.propertypro.property_platform.subscription.service;

import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import com.propertypro.property_platform.subscription.domain.SubscriptionStatus;
import com.propertypro.property_platform.subscription.domain.UserSubscription;
import com.propertypro.property_platform.subscription.dto.PublicSubscriptionPlanResponse;
import com.propertypro.property_platform.subscription.dto.SubscribeRequest;
import com.propertypro.property_platform.subscription.dto.UserSubscriptionResponse;
import com.propertypro.property_platform.subscription.exception.SubscriptionExceptions;
import com.propertypro.property_platform.subscription.exception.SubscriptionPlanExceptions;
import com.propertypro.property_platform.subscription.repository.SubscriptionPlanRepository;
import com.propertypro.property_platform.subscription.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;

import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_CREATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_VIEW;

/**
 * What an app user does with plans: browse the active ones, see their own subscription and take a plan.
 * Every subscription query is by the caller's id from the token, so there is no id to probe.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSubscriptionService {

	private static final String ONE_ACTIVE_PER_USER = "uq_user_subscriptions_active_user";

	private final SubscriptionPlanRepository planRepository;
	private final UserSubscriptionRepository subscriptionRepository;
	private final SubscriptionProperties properties;
	private final Clock clock;

	@Transactional(readOnly = true)
	public List<PublicSubscriptionPlanResponse> activePlans() {
		return planRepository.findByStatusOrderBySortOrderAscIdAsc(SubscriptionPlanStatus.ACTIVE).stream()
			.map(PublicSubscriptionPlanResponse::from).toList();
	}

	/** The subscription in force now; 404 when there is none (none taken, pending, cancelled or ended). */
	@Transactional(readOnly = true)
	public UserSubscriptionResponse mine(CurrentActor actor) {
		requirePermission(actor, SUBSCRIPTION_VIEW);
		return subscriptionRepository.findInForce(actor.userId(), SubscriptionStatus.ACTIVE, clock.instant())
			.map(UserSubscriptionResponse::from).orElseThrow(SubscriptionExceptions::notFound);
	}

	/**
	 * Takes a plan from now on. Free plans activate at once; paid plans need a payment, which only the
	 * dev profile waives while no gateway exists. One subscription in force per user (409 otherwise).
	 */
	@Transactional
	public UserSubscriptionResponse subscribe(CurrentActor actor, SubscribeRequest request) {
		requirePermission(actor, SUBSCRIPTION_CREATE);
		if (subscriptionRepository.findInForce(actor.userId(), SubscriptionStatus.ACTIVE, clock.instant())
			.isPresent()) {
			throw SubscriptionExceptions.alreadySubscribed();
		}
		SubscriptionPlan plan = planRepository.findById(request.planId())
			.orElseThrow(SubscriptionPlanExceptions::notFound);
		if (plan.getStatus() == SubscriptionPlanStatus.ACTIVE && plan.getPrice().compareTo(BigDecimal.ZERO) > 0
				&& !properties.allowUnpaidActivation()) {
			throw SubscriptionExceptions.paymentRequired();
		}
		UserSubscription subscription = new UserSubscription(actor.userId(), plan, clock.instant());
		subscription.activate();
		try {
			subscriptionRepository.saveAndFlush(subscription);
		}
		catch (DataIntegrityViolationException ex) {
			String cause = ex.getMostSpecificCause().getMessage();
			if (cause != null && cause.contains(ONE_ACTIVE_PER_USER)) {
				throw SubscriptionExceptions.alreadySubscribed();
			}
			throw ex;
		}
		log.info("Subscription taken userId={} planId={} unpaid={}", actor.userId(), plan.getId(),
				plan.getPrice().signum() > 0);
		return UserSubscriptionResponse.from(subscription);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw SubscriptionExceptions.actionForbidden();
		}
	}

}
