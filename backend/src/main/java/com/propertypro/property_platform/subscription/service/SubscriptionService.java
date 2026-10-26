package com.propertypro.property_platform.subscription.service;

import com.propertypro.property_platform.subscription.domain.SubscriptionStatus;
import com.propertypro.property_platform.subscription.domain.UserSubscription;
import com.propertypro.property_platform.subscription.exception.SubscriptionExceptions;
import com.propertypro.property_platform.subscription.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.function.LongSupplier;

/**
 * Feature gating by the user's subscription in force: status {@code active} and within its
 * start/end window. Limits come from that subscription's copy of the plan terms, never from the
 * request or the plan's current values. Gating never changes the subscription itself.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

	private static final List<SubscriptionStatus> ONCE_IN_FORCE = List.of(SubscriptionStatus.ACTIVE,
			SubscriptionStatus.EXPIRED);

	private final UserSubscriptionRepository subscriptionRepository;
	private final Clock clock;

	/**
	 * Throws unless the user may create one more property. Locks the user's subscription row until
	 * the caller's transaction ends, so concurrent creations by the same user run one after another
	 * and each counts the others' committed properties. The caller must insert the property in the
	 * same transaction.
	 *
	 * @param currentProperties counts the user's properties; called only once the lock is held
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void requirePropertyCapacity(Long userId, LongSupplier currentProperties) {
		UserSubscription subscription = lockSubscriptionInForce(userId);
		Integer limit = subscription.getNoOfProperties();
		if (limit == null) {
			return;
		}
		long current = currentProperties.getAsLong();
		if (current >= limit) {
			throw SubscriptionExceptions.propertyLimitReached(subscription.getPlanTitle(), limit, current);
		}
	}

	private UserSubscription lockSubscriptionInForce(Long userId) {
		Instant now = clock.instant();
		return subscriptionRepository.findInForceForUpdate(userId, SubscriptionStatus.ACTIVE, now)
			.orElseThrow(() -> subscriptionRepository.existsEndedBefore(userId, ONCE_IN_FORCE, now)
					? SubscriptionExceptions.subscriptionExpired()
					: SubscriptionExceptions.subscriptionRequired());
	}

}
