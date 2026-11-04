package com.propertypro.property_platform.auth.job;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.config.AuthProperties;
import com.propertypro.property_platform.auth.repository.AuthSessionRepository;
import com.propertypro.property_platform.otp.repository.OtpChallengeRepository;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Removes expired OTP challenges, finished sessions and never-verified pending registrations.
 * Idempotent, so running it on several instances at once is safe.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthCleanupJob {

	/** Kept for a while after expiry so recent send counts and audits still see them. */
	private static final Duration OTP_RETENTION = Duration.ofDays(1);
	private static final Duration SESSION_RETENTION = Duration.ofDays(7);

	private final OtpChallengeRepository otpChallengeRepository;
	private final AuthSessionRepository sessionRepository;
	private final UserRepository userRepository;
	private final AuthProperties properties;
	private final Clock clock;
	private final SystemLogService systemLog;

	@Scheduled(initialDelayString = "PT5M", fixedDelayString = "${app.auth.cleanup-interval:PT1H}")
	@Transactional
	public void cleanUp() {
		Instant now = clock.instant();
		int challenges = otpChallengeRepository.deleteExpiredBefore(now.minus(OTP_RETENTION));
		int sessions = sessionRepository.deleteFinishedBefore(now.minus(SESSION_RETENTION));
		int registrations = userRepository.deleteUnverifiedPendingCreatedBefore(
				now.minus(properties.pendingRegistrationRetention()));
		if (challenges + sessions + registrations > 0) {
			log.info("Auth cleanup removed otpChallenges={} sessions={} unverifiedRegistrations={}", challenges,
					sessions, registrations);
			systemLog.record(SystemLogEntry.info(SystemLogModules.AUTHENTICATION, "Expired authentication data removed")
				.withAdditionalData(Map.of("otpChallenges", challenges, "sessions", sessions,
						"unverifiedRegistrations", registrations)));
		}
	}

}
