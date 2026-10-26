package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.dto.ResendOtpRequest;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.otp.config.OtpProperties;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.service.OtpService;
import com.propertypro.property_platform.security.ratelimit.RateLimit;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.UserStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Resend-OTP and forgot-password. Both respond identically whether or not an eligible account
 * exists; the throttles below apply to every identifier, so they do not reveal accounts either.
 */
@Service
public class OtpRequestService {

	private final AccountResolver accountResolver;
	private final OtpService otpService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final OtpProperties otpProperties;
	private final TransactionTemplate transaction;

	public OtpRequestService(AccountResolver accountResolver, OtpService otpService, RateLimiter rateLimiter,
			RateLimitProperties limits, OtpProperties otpProperties, PlatformTransactionManager transactionManager) {
		this.accountResolver = accountResolver;
		this.otpService = otpService;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.otpProperties = otpProperties;
		this.transaction = new TransactionTemplate(transactionManager);
	}

	public void resend(ResendOtpRequest request, String clientIp) {
		OtpPurpose purpose = OtpPurpose.fromValue(request.purpose());
		if (purpose == OtpPurpose.PASSWORD_RESET) {
			requestPasswordReset(request.identifier(), clientIp);
			return;
		}
		Identifier identifier = accountResolver.parseOrReject(request.identifier());
		if (identifier.verificationPurpose() != purpose) {
			throw new FieldValidationException("identifier", "does not match the purpose");
		}
		throttle(purpose, identifier, clientIp);
		transaction.executeWithoutResult(status -> accountResolver.findUser(identifier)
				.filter(user -> user.getStatus() == UserStatus.PENDING || user.getStatus() == UserStatus.ACTIVE)
				.filter(user -> !AccountResolver.isVerified(user, identifier))
				.ifPresent(user -> otpService.issue(user.getId(), purpose, identifier.channel(), identifier.value())));
	}

	/**
	 * Sends a reset code only to a verified email or phone of an active account, through that
	 * identifier's own channel. Never changes the password.
	 */
	public void requestPasswordReset(String rawIdentifier, String clientIp) {
		Identifier identifier = accountResolver.parseOrReject(rawIdentifier);
		throttle(OtpPurpose.PASSWORD_RESET, identifier, clientIp);
		transaction.executeWithoutResult(status -> accountResolver.findUser(identifier)
				.filter(PasswordResetService::canResetPassword)
				.filter(user -> AccountResolver.isVerified(user, identifier))
				.ifPresent(user -> otpService.issue(user.getId(), OtpPurpose.PASSWORD_RESET, identifier.channel(),
						identifier.value())));
	}

	private void throttle(OtpPurpose purpose, Identifier identifier, String clientIp) {
		rateLimiter.acquire("otp-send:ip:" + clientIp, limits.otpSendIp());
		rateLimiter.acquire("otp-send:cooldown:" + purpose.getValue() + ':' + identifier.value(),
				new RateLimit(1, otpProperties.resendCooldown()));
		rateLimiter.acquire("otp-send:destination:" + identifier.value(), otpProperties.destinationLimit());
		rateLimiter.acquire("otp-send:global", limits.otpSendGlobal());
	}

}
