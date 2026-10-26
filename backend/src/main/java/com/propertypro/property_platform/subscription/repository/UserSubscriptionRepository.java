package com.propertypro.property_platform.subscription.repository;

import com.propertypro.property_platform.subscription.domain.SubscriptionStatus;
import com.propertypro.property_platform.subscription.domain.UserSubscription;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {

	/**
	 * The user's subscription in force at {@code now}, row-locked until the transaction ends.
	 * Pass {@link SubscriptionStatus#ACTIVE}; at most one active row exists per user.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("""
			select s from UserSubscription s
			where s.userId = :userId and s.status = :active and s.startsAt <= :now
			  and (s.endsAt is null or s.endsAt > :now)""")
	Optional<UserSubscription> findInForceForUpdate(Long userId, SubscriptionStatus active, Instant now);

	/** Whether a subscription with one of {@code statuses} ran until its end before {@code now}. */
	@Query("""
			select count(s) > 0 from UserSubscription s
			where s.userId = :userId and s.status in :statuses and s.endsAt <= :now""")
	boolean existsEndedBefore(Long userId, Collection<SubscriptionStatus> statuses, Instant now);

}
