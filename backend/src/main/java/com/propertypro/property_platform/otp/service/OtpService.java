package com.propertypro.property_platform.otp.service;

import com.propertypro.property_platform.otp.config.OtpProperties;
import com.propertypro.property_platform.otp.domain.OtpChallenge;
import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.event.OtpIssuedEvent;
import com.propertypro.property_platform.otp.exception.InvalidOtpException;
import com.propertypro.property_platform.otp.repository.OtpChallengeRepository;
import com.propertypro.property_platform.security.ratelimit.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Issues and verifies OTP challenges. Both operations join the caller's transaction, so a
 * challenge is created or consumed together with the caller's own changes.
 */
@Service
@RequiredArgsConstructor
public class OtpService {

	private final OtpChallengeRepository repository;
	private final OtpAttemptRecorder attemptRecorder;
	private final OtpHasher hasher;
	private final OtpProperties properties;
	private final ApplicationEventPublisher events;
	private final Clock clock;

	/**
	 * Replaces any open challenge for the user and purpose with a new one. The code is delivered
	 * after the transaction commits.
	 * @throws RateLimitExceededException during the resend cooldown or above the destination limit
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void issue(Long userId, OtpPurpose purpose, OtpChannel channel, String destination) {
		Instant now = clock.instant();
		Duration cooldown = properties.resendCooldown();
		repository.findFirstByUserIdAndPurposeAndDestinationOrderByCreatedAtDesc(userId, purpose, destination)
				.map(last -> last.getCreatedAt().plus(cooldown))
				.filter(now::isBefore)
				.ifPresent(allowedAt -> {
					throw new RateLimitExceededException(Duration.between(now, allowedAt));
				});
		Duration window = properties.destinationLimit().window();
		if (repository.countByDestinationAndCreatedAtAfter(destination, now.minus(window))
				>= properties.destinationLimit().maxRequests()) {
			throw new RateLimitExceededException(window);
		}

		repository.invalidateOpen(userId, purpose, now);
		String code = hasher.generateCode();
		OtpChallenge challenge = new OtpChallenge(userId, purpose, channel, destination,
				hasher.hash(purpose, destination, code), now.plus(properties.ttl()), now);
		try {
			repository.saveAndFlush(challenge);
		}
		catch (DataIntegrityViolationException ex) {
			// A concurrent request created the open challenge first.
			throw new RateLimitExceededException(cooldown);
		}
		events.publishEvent(new OtpIssuedEvent(challenge.getId(), purpose, channel, destination, code));
	}

	/**
	 * Verifies the code against the open challenge for the user, purpose and destination, and
	 * consumes it. Any failure throws the same {@link InvalidOtpException}.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void verifyAndConsume(Long userId, OtpPurpose purpose, String destination, String code) {
		Instant now = clock.instant();
		OtpChallenge challenge = repository
				.findFirstByUserIdAndPurposeAndConsumedAtIsNullAndInvalidatedAtIsNull(userId, purpose)
				.filter(c -> c.getDestination().equals(destination))
				.orElseThrow(InvalidOtpException::new);
		if (!attemptRecorder.reserveAttempt(challenge.getId(), properties.maxAttempts(), now)) {
			throw new InvalidOtpException();
		}
		if (!hasher.matches(challenge.getOtpHash(), purpose, destination, code)) {
			throw new InvalidOtpException();
		}
		if (repository.consume(challenge.getId(), now) != 1) {
			throw new InvalidOtpException();
		}
	}

	@Transactional(propagation = Propagation.MANDATORY)
	public void invalidateOpen(Long userId, OtpPurpose purpose) {
		repository.invalidateOpen(userId, purpose, clock.instant());
	}

}
