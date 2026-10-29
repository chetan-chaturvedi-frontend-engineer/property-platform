package com.propertypro.property_platform.subscription.service;

import com.propertypro.property_platform.common.exception.ApiException;
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
		UserSubscription subscription = lockSubscriptionInForce(userId, SubscriptionExceptions.subscriptionExpired(),
				SubscriptionExceptions.subscriptionRequired());
		Integer limit = subscription.getNoOfProperties();
		if (limit == null) {
			return;
		}
		long current = currentProperties.getAsLong();
		if (current >= limit) {
			throw SubscriptionExceptions.propertyLimitReached(subscription.getPlanTitle(), limit, current);
		}
	}

	/**
	 * Throws unless the builder may hold one more team member (pending or active). Same locking as
	 * {@link #requirePropertyCapacity}: concurrent invitations and reactivations by the same builder run
	 * one after another, so the limit cannot be exceeded. The caller must write the membership in the
	 * same transaction.
	 *
	 * @param currentMembers counts the builder's pending and active members; called only once the lock is held
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void requireTeamMemberCapacity(Long builderId, LongSupplier currentMembers) {
		UserSubscription subscription = lockSubscriptionInForce(builderId,
				SubscriptionExceptions.teamSubscriptionExpired(), SubscriptionExceptions.teamSubscriptionRequired());
		int limit = subscription.getNoOfTeamMembers();
		if (limit == 0) {
			throw SubscriptionExceptions.teamManagementNotIncluded(subscription.getPlanTitle());
		}
		long current = currentMembers.getAsLong();
		if (current >= limit) {
			throw SubscriptionExceptions.teamMemberLimitReached(subscription.getPlanTitle(), limit, current);
		}
	}

	/**
	 * Throws unless the builder's subscription in force includes team management. For changes that use
	 * no extra seat, such as a member's role or permissions; nothing is locked.
	 */
	@Transactional(readOnly = true)
	public void requireTeamManagement(Long builderId) {
		Instant now = clock.instant();
		UserSubscription subscription = subscriptionRepository.findInForce(builderId, SubscriptionStatus.ACTIVE, now)
			.orElseThrow(() -> subscriptionRepository.existsEndedBefore(builderId, ONCE_IN_FORCE, now)
					? SubscriptionExceptions.teamSubscriptionExpired()
					: SubscriptionExceptions.teamSubscriptionRequired());
		if (subscription.getNoOfTeamMembers() == 0) {
			throw SubscriptionExceptions.teamManagementNotIncluded(subscription.getPlanTitle());
		}
	}

	private UserSubscription lockSubscriptionInForce(Long userId, ApiException expired, ApiException required) {
		Instant now = clock.instant();
		return subscriptionRepository.findInForceForUpdate(userId, SubscriptionStatus.ACTIVE, now)
			.orElseThrow(() -> subscriptionRepository.existsEndedBefore(userId, ONCE_IN_FORCE, now) ? expired : required);
	}

}
