package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.dto.RegisterRequest;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.otp.service.OtpService;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Self-registration of {@code user} accounts. The account starts {@code pending} with separate
 * email and phone challenges; codes are delivered after commit, outside the transaction.
 */
@Slf4j
@Service
public class RegistrationService {

	private final UserRepository userRepository;
	private final OtpService otpService;
	private final PasswordEncoder passwordEncoder;
	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final TransactionTemplate transaction;

	public RegistrationService(UserRepository userRepository, OtpService otpService, PasswordEncoder passwordEncoder,
			PhoneNumberNormalizer phoneNumberNormalizer, RateLimiter rateLimiter, RateLimitProperties limits,
			PlatformTransactionManager transactionManager) {
		this.userRepository = userRepository;
		this.otpService = otpService;
		this.passwordEncoder = passwordEncoder;
		this.phoneNumberNormalizer = phoneNumberNormalizer;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.transaction = new TransactionTemplate(transactionManager);
	}

	public User register(RegisterRequest request, String clientIp) {
		rateLimiter.acquire("register:ip:" + clientIp, limits.registerIp());
		String email = AccountResolver.normalizeEmail(request.email());
		String phone = phoneNumberNormalizer.normalize(request.phone())
				.orElseThrow(() -> new FieldValidationException("phone", "must be a valid phone number"));
		// Hash before opening the transaction so a connection is not held during BCrypt.
		String passwordHash = passwordEncoder.encode(request.password());

		User user;
		try {
			user = transaction.execute(status -> {
				if (userRepository.existsByEmailOrPhoneIncludingDeleted(email, phone)) {
					throw AuthExceptions.accountExists();
				}
				User created = userRepository.saveAndFlush(
						new User(email, phone, passwordHash, request.fullName().trim()));
				otpService.issue(created.getId(), OtpPurpose.EMAIL_VERIFICATION, OtpChannel.EMAIL, email);
				otpService.issue(created.getId(), OtpPurpose.PHONE_VERIFICATION, OtpChannel.SMS, phone);
				return created;
			});
		}
		catch (DataIntegrityViolationException ex) {
			// A concurrent registration took the email or phone between the check and the insert.
			throw AuthExceptions.accountExists();
		}
		log.info("User registered userId={}", user.getId());
		return user;
	}

}
