package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.dto.LoginRequest;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Password login for {@code user} accounts. The password is checked first; account state is only
 * revealed to callers who know it, and a correct password never bypasses the state checks.
 */
@Slf4j
@Service
public class LoginService {

	private final AccountResolver accountResolver;
	private final TokenService tokenService;
	private final PasswordEncoder passwordEncoder;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final SystemLogService systemLog;
	/** Compared against when the account does not exist, so response time does not reveal it. */
	private final String dummyPasswordHash;

	public LoginService(AccountResolver accountResolver, TokenService tokenService, PasswordEncoder passwordEncoder,
			RateLimiter rateLimiter, RateLimitProperties limits, SystemLogService systemLog) {
		this.accountResolver = accountResolver;
		this.tokenService = tokenService;
		this.passwordEncoder = passwordEncoder;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.systemLog = systemLog;
		this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	public LoginResult login(LoginRequest request, String clientIp) {
		rateLimiter.acquire("login:ip:" + clientIp, limits.loginIp());
		Optional<Identifier> identifier = accountResolver.parse(request.identifier());
		String failureKey = "login:failures:"
				+ identifier.map(Identifier::value).orElse(request.identifier().trim().toLowerCase(Locale.ROOT));
		rateLimiter.checkNotExceeded(failureKey, limits.loginIdentifier());

		Optional<User> user = identifier.flatMap(accountResolver::findUser);
		boolean passwordMatches = passwordEncoder.matches(request.password(),
				user.map(User::getPasswordHash).orElse(dummyPasswordHash));
		if (user.isEmpty() || !passwordMatches) {
			rateLimiter.acquire(failureKey, limits.loginIdentifier());
			log.warn("Login failed ip={} userId={}", clientIp, user.map(User::getId).orElse(null));
			systemLog.record(SystemLogEntry.warning(SystemLogModules.AUTHENTICATION, "Failed login attempt")
				.withUserId(user.map(User::getId).orElse(null))
				.withAdditionalData(Map.of("reason", "invalid_credentials")));
			throw AuthExceptions.invalidCredentials();
		}

		User account = user.get();
		ApiException stateError = AccountStatePolicy.check(account);
		if (stateError != null) {
			log.warn("Login rejected userId={} status={}", account.getId(), account.getStatus().getValue());
			systemLog.record(SystemLogEntry.warning(SystemLogModules.AUTHENTICATION, "Login rejected by account status")
				.withUserId(account.getId())
				.withAdditionalData(Map.of("status", account.getStatus().getValue())));
			throw stateError;
		}
		IssuedTokens tokens = tokenService.startSession(account.getId());
		log.info("Login succeeded userId={}", account.getId());
		systemLog.record(SystemLogEntry.success(SystemLogModules.AUTHENTICATION, "User logged in").withUserId(account.getId()));
		return new LoginResult(account, tokens);
	}

	public record LoginResult(User user, IssuedTokens tokens) {
	}

}
