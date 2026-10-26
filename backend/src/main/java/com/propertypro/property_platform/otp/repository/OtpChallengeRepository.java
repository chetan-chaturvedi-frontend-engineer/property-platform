package com.propertypro.property_platform.otp.repository;

import com.propertypro.property_platform.otp.domain.OtpChallenge;
import com.propertypro.property_platform.otp.domain.OtpDeliveryStatus;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {

	Optional<OtpChallenge> findFirstByUserIdAndPurposeAndConsumedAtIsNullAndInvalidatedAtIsNull(Long userId,
			OtpPurpose purpose);

	Optional<OtpChallenge> findFirstByUserIdAndPurposeAndDestinationOrderByCreatedAtDesc(Long userId, OtpPurpose purpose,
			String destination);

	long countByDestinationAndCreatedAtAfter(String destination, Instant since);

	@Modifying(flushAutomatically = true)
	@Query("""
			update OtpChallenge c set c.invalidatedAt = :now
			where c.userId = :userId and c.purpose = :purpose and c.consumedAt is null and c.invalidatedAt is null""")
	int invalidateOpen(Long userId, OtpPurpose purpose, Instant now);

	/** Counts one attempt if the challenge is still usable; returns 0 when it is not. */
	@Modifying
	@Query("""
			update OtpChallenge c set c.attemptCount = c.attemptCount + 1
			where c.id = :id and c.attemptCount < :maxAttempts and c.consumedAt is null
			  and c.invalidatedAt is null and c.expiresAt > :now""")
	int reserveAttempt(Long id, int maxAttempts, Instant now);

	/** Marks the challenge consumed; returns 0 if another request consumed or replaced it first. */
	@Modifying
	@Query("""
			update OtpChallenge c set c.consumedAt = :now
			where c.id = :id and c.consumedAt is null and c.invalidatedAt is null and c.expiresAt > :now""")
	int consume(Long id, Instant now);

	@Transactional
	@Modifying
	@Query("update OtpChallenge c set c.deliveryStatus = :status, c.deliveryAttempts = :attempts where c.id = :id")
	int updateDelivery(Long id, OtpDeliveryStatus status, int attempts);

	@Modifying
	@Query("delete from OtpChallenge c where c.expiresAt < :before")
	int deleteExpiredBefore(Instant before);

}
