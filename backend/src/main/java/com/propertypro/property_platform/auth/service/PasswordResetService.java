package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.dto.ResetPasswordRequest;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.exception.InvalidOtpException;
import com.propertypro.property_platform.otp.service.OtpService;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Completes a password reset. The OTP bound to the identifier is the only proof of identity; the
 * password change, OTP consumption and session revocation commit together. Status is unchanged.
 */
@Slf4j
@Service
public class PasswordResetService {

	private final AccountResolver accountResolver;
	private final OtpService otpService;
	private final TokenService tokenService;
	private final PasswordEncoder passwordEncoder;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final TransactionTemplate transaction;

	public PasswordResetService(AccountResolver accountResolver, OtpService otpService, TokenService tokenService,
			PasswordEncoder passwordEncoder, RateLimiter rateLimiter, RateLimitProperties limits,
			PlatformTransactionManager transactionManager) {
		this.accountResolver = accountResolver;
		this.otpService = otpService;
		this.tokenService = tokenService;
		this.passwordEncoder = passwordEncoder;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.transaction = new TransactionTemplate(transactionManager);
	}

	/** Only active accounts may reset; a reset never activates or unblocks an account. */
	static boolean canResetPassword(User user) {
		return user.getStatus() == UserStatus.ACTIVE;
	}

	public void reset(ResetPasswordRequest request, String clientIp) {
		rateLimiter.acquire("otp-verify:ip:" + clientIp, limits.otpVerifyIp());
		Identifier identifier = accountResolver.parseOrReject(request.identifier());
		rateLimiter.acquire("otp-verify:id:" + identifier.value(), limits.otpVerifyIdentifier());
		String passwordHash = passwordEncoder.encode(request.password());

		Long userId = transaction.execute(status -> {
			User user = accountResolver.findUser(identifier)
					.filter(PasswordResetService::canResetPassword)
					.filter(u -> AccountResolver.isVerified(u, identifier))
					.orElseThrow(InvalidOtpException::new);
			otpService.verifyAndConsume(user.getId(), OtpPurpose.PASSWORD_RESET, identifier.value(), request.otp());
			user.setPasswordHash(passwordHash);
			otpService.invalidateOpen(user.getId(), OtpPurpose.PASSWORD_RESET);
			tokenService.revokeAllSessions(user.getId(), "password_reset");
			return user.getId();
		});
		log.info("Password reset completed, all sessions revoked userId={}", userId);
	}

}
