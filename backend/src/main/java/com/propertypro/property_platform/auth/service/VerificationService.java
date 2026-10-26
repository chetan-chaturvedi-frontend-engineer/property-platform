package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.dto.VerifyOtpRequest;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.exception.InvalidOtpException;
import com.propertypro.property_platform.otp.service.OtpService;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;

/**
 * Email/phone verification. Each code verifies only its own channel. Verifying either channel
 * activates a pending account; suspended, rejected, inactive and closed accounts cannot verify.
 */
@Slf4j
@Service
public class VerificationService {

	private final AccountResolver accountResolver;
	private final OtpService otpService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final TransactionTemplate transaction;
	private final Clock clock;

	public VerificationService(AccountResolver accountResolver, OtpService otpService, RateLimiter rateLimiter,
			RateLimitProperties limits, PlatformTransactionManager transactionManager, Clock clock) {
		this.accountResolver = accountResolver;
		this.otpService = otpService;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.transaction = new TransactionTemplate(transactionManager);
		this.clock = clock;
	}

	public User verify(VerifyOtpRequest request, String clientIp) {
		rateLimiter.acquire("otp-verify:ip:" + clientIp, limits.otpVerifyIp());
		OtpPurpose purpose = OtpPurpose.fromValue(request.purpose());
		Identifier identifier = accountResolver.parseOrReject(request.identifier());
		if (identifier.verificationPurpose() != purpose) {
			throw new FieldValidationException("identifier", purpose == OtpPurpose.EMAIL_VERIFICATION
					? "must be an email address for email_verification"
					: "must be a phone number for phone_verification");
		}
		rateLimiter.acquire("otp-verify:id:" + identifier.value(), limits.otpVerifyIdentifier());

		User user = transaction.execute(status -> {
			User account = accountResolver.findUser(identifier)
					.filter(u -> u.getStatus() == UserStatus.PENDING || u.getStatus() == UserStatus.ACTIVE)
					.orElseThrow(InvalidOtpException::new);
			otpService.verifyAndConsume(account.getId(), purpose, identifier.value(), request.otp());
			Instant now = clock.instant();
			switch (identifier.type()) {
				case EMAIL -> account.markEmailVerified(now);
				case PHONE -> account.markPhoneVerified(now);
			}
			account.activateIfPending();
			return account;
		});
		log.info("Verified {} userId={} status={}", purpose.getValue(), user.getId(), user.getStatus().getValue());
		return user;
	}

}
