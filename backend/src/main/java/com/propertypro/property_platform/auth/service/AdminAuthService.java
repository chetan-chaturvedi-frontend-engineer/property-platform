package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.dto.AdminLoginRequest;
import com.propertypro.property_platform.auth.dto.AdminUserResponse;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.role.service.ResolvedRole;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.security.Permissions;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Admin-panel authentication. Any account may sign in here, whatever its role name, but only if its
 * role ({@code users.user_type} = {@code roles.slug}, active and not deleted) grants
 * {@link Permissions#ADMIN_PANEL_ACCESS}. Valid credentials alone are never enough.
 * <p>
 * Tokens are the same session-bound tokens as the app login and carry no permissions: every request
 * reloads them from the role, so revoking access or deactivating the role applies on the next request.
 */
@Slf4j
@Service
public class AdminAuthService {

	private final AccountResolver accountResolver;
	private final TokenService tokenService;
	private final RolePermissionService rolePermissionService;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;
	private final SystemLogService systemLog;
	/** Compared against when the account does not exist, so response time does not reveal it. */
	private final String dummyPasswordHash;

	public AdminAuthService(AccountResolver accountResolver, TokenService tokenService,
			RolePermissionService rolePermissionService, UserRepository userRepository, PasswordEncoder passwordEncoder,
			RateLimiter rateLimiter, RateLimitProperties limits, SystemLogService systemLog) {
		this.accountResolver = accountResolver;
		this.tokenService = tokenService;
		this.rolePermissionService = rolePermissionService;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.rateLimiter = rateLimiter;
		this.limits = limits;
		this.systemLog = systemLog;
		this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	/**
	 * Order matters: rate limits, identifier format, password (same work and response whether or not
	 * the account exists), then account state and admin access, which are only revealed to callers who
	 * know the password. A session is created only after every check passed.
	 */
	public AdminSession login(AdminLoginRequest request, String clientIp) {
		rateLimiter.acquire("admin-login:ip:" + clientIp, limits.adminLoginIp());
		Identifier identifier = accountResolver.parseOrReject(request.identifier());
		String failureKey = "admin-login:failures:" + identifier.value();
		rateLimiter.checkNotExceeded(failureKey, limits.adminLoginIdentifier());

		Optional<User> user = accountResolver.findAnyUser(identifier);
		boolean passwordMatches = passwordEncoder.matches(request.password(),
				user.map(User::getPasswordHash).orElse(dummyPasswordHash));
		if (user.isEmpty() || !passwordMatches) {
			rateLimiter.acquire(failureKey, limits.adminLoginIdentifier());
			log.warn("Admin login failed ip={} userId={}", clientIp, user.map(User::getId).orElse(null));
			systemLog.record(SystemLogEntry.warning(SystemLogModules.AUTHENTICATION, "Failed admin login attempt")
				.withUserId(user.map(User::getId).orElse(null))
				.withAdditionalData(Map.of("reason", "invalid_credentials")));
			throw AuthExceptions.invalidCredentials();
		}

		User account = user.get();
		ApiException stateError = AccountStatePolicy.check(account);
		if (stateError != null) {
			log.warn("Admin login rejected ip={} userId={} status={}", clientIp, account.getId(),
					account.getStatus().getValue());
			systemLog.record(SystemLogEntry.warning(SystemLogModules.AUTHENTICATION, "Admin login rejected by account status")
				.withUserId(account.getId())
				.withAdditionalData(Map.of("status", account.getStatus().getValue())));
			throw stateError;
		}
		ResolvedRole role = requireAdminRole(account.getId());
		IssuedTokens tokens = tokenService.startSession(account.getId());
		log.info("Admin login succeeded ip={} userId={} role={}", clientIp, account.getId(), role.slug());
		systemLog.record(SystemLogEntry.success(SystemLogModules.AUTHENTICATION, "Admin logged in").withUserId(account.getId()));
		return new AdminSession(tokens, AdminUserResponse.of(account, role));
	}

	/**
	 * Rotates the refresh token like the app refresh, then requires admin access again: if it was
	 * revoked, the new session tokens are revoked at once and the caller gets 403.
	 */
	public AdminSession refresh(String rawRefreshToken) {
		IssuedTokens tokens = tokenService.refresh(rawRefreshToken);
		Optional<ResolvedRole> role = rolePermissionService.roleOfUser(tokens.userId())
			.filter(r -> r.grants(Permissions.ADMIN_PANEL_ACCESS));
		Optional<User> user = userRepository.findById(tokens.userId());
		if (role.isEmpty() || user.isEmpty()) {
			tokenService.revokeSession(tokens.sessionId(), "admin_access_revoked");
			log.warn("Admin token refresh denied userId={}", tokens.userId());
			systemLog.record(SystemLogEntry.warning(SystemLogModules.PERMISSIONS, "Admin token refresh denied")
				.withUserId(tokens.userId()));
			throw AuthExceptions.adminAccessDenied();
		}
		return new AdminSession(tokens, AdminUserResponse.of(user.get(), role.get()));
	}

	/** The signed-in user; the caller's admin access was already checked for this request. */
	public AdminUserResponse me(Long userId) {
		User user = userRepository.findById(userId).orElseThrow(AuthExceptions::invalidCredentials);
		return AdminUserResponse.of(user, requireAdminRole(userId));
	}

	private ResolvedRole requireAdminRole(Long userId) {
		return rolePermissionService.roleOfUser(userId)
			.filter(role -> role.grants(Permissions.ADMIN_PANEL_ACCESS))
			.orElseThrow(() -> {
				log.warn("Admin access denied userId={}", userId);
				systemLog.record(SystemLogEntry.warning(SystemLogModules.PERMISSIONS, "Admin panel access denied")
					.withUserId(userId));
				return AuthExceptions.adminAccessDenied();
			});
	}

}
