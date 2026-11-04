package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogModules;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.domain.AuthSession;
import com.propertypro.property_platform.auth.domain.RefreshToken;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.auth.repository.AuthSessionRepository;
import com.propertypro.property_platform.auth.repository.RefreshTokenRepository;
import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.security.ActiveSessionValidator;
import com.propertypro.property_platform.security.JwtProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sessions, short-lived access tokens (JWT) and rotating refresh tokens. A refresh token can be
 * used once; presenting a used one revokes the whole session (reuse detection).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

	private final SecureRandom random = new SecureRandom();
	private final JwtEncoder jwtEncoder;
	private final JwtProperties properties;
	private final AuthSessionRepository sessionRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final Clock clock;
	private final SystemLogService systemLog;

	@Transactional
	public IssuedTokens startSession(Long userId) {
		Instant now = clock.instant();
		AuthSession session = sessionRepository.save(
				new AuthSession(UUID.randomUUID(), userId, now.plus(properties.refreshTokenTtl()), now));
		return issueTokens(session, now);
	}

	/** Rotates the refresh token. The reuse revocation must commit even though the call fails. */
	@Transactional(noRollbackFor = ApiException.class)
	public IssuedTokens refresh(String rawRefreshToken) {
		Instant now = clock.instant();
		RefreshToken token = refreshTokenRepository.findByTokenHash(sha256(rawRefreshToken))
				.orElseThrow(AuthExceptions::invalidRefreshToken);
		if (refreshTokenRepository.markUsed(token.getId(), now) != 1) {
			sessionRepository.revoke(token.getSessionId(), now, "refresh_token_reuse");
			log.warn("Refresh token reuse detected, session revoked sessionId={}", token.getSessionId());
			systemLog.record(SystemLogEntry.warning(SystemLogModules.AUTHENTICATION, "Refresh token reuse detected, session revoked")
				.withAdditionalData(Map.of("sessionId", token.getSessionId().toString())));
			throw AuthExceptions.invalidRefreshToken();
		}
		AuthSession session = sessionRepository.findById(token.getSessionId())
				.orElseThrow(AuthExceptions::invalidRefreshToken);
		if (!token.getExpiresAt().isAfter(now) || !sessionRepository.isActive(session.getId(), session.getUserId(), now)) {
			throw AuthExceptions.invalidRefreshToken();
		}
		return issueTokens(session, now);
	}

	@Transactional
	public void revokeSession(UUID sessionId, String reason) {
		sessionRepository.revoke(sessionId, clock.instant(), reason);
	}

	/** A logout the user asked for, unlike the other reasons a session is revoked. */
	@Transactional
	public void logout(UUID sessionId, String reason) {
		revokeSession(sessionId, reason);
		systemLog.record(SystemLogEntry.success(SystemLogModules.AUTHENTICATION, "User logged out")
			.withAdditionalData(Map.of("reason", reason)));
	}

	/** Logs the user out everywhere; call when credentials change or the account is blocked. */
	@Transactional
	public void revokeAllSessions(Long userId, String reason) {
		sessionRepository.revokeAllForUser(userId, clock.instant(), reason);
	}

	private IssuedTokens issueTokens(AuthSession session, Instant now) {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String rawRefreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		refreshTokenRepository.save(new RefreshToken(session.getId(), sha256(rawRefreshToken), session.getExpiresAt(), now));

		// Minimal claims: who (sub) and which session (sid). No profile, role or secret data.
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.issuer(properties.issuer())
				.audience(List.of(properties.audience()))
				.subject(String.valueOf(session.getUserId()))
				.issuedAt(now)
				.expiresAt(now.plus(properties.accessTokenTtl()))
				.claim(ActiveSessionValidator.SESSION_CLAIM, session.getId().toString())
				.build();
		String accessToken = jwtEncoder
				.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
				.getTokenValue();
		return new IssuedTokens(session.getUserId(), session.getId(), accessToken, properties.accessTokenTtl(), rawRefreshToken,
				session.getExpiresAt());
	}

	private static String sha256(String value) {
		try {
			return HexFormat.of().formatHex(
					MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 unavailable", ex);
		}
	}

}
