package com.propertypro.property_platform.otp.service;

import com.propertypro.property_platform.otp.repository.OtpChallengeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Commits an attempt in its own transaction before the code is compared, so the count survives a
 * rollback of the caller and concurrent guesses cannot exceed the attempt limit.
 */
@Component
@RequiredArgsConstructor
class OtpAttemptRecorder {

	private final OtpChallengeRepository repository;

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public boolean reserveAttempt(Long challengeId, int maxAttempts, Instant now) {
		return repository.reserveAttempt(challengeId, maxAttempts, now) == 1;
	}

}
