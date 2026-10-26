package com.propertypro.property_platform.security;

import com.propertypro.property_platform.auth.repository.AuthSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.UUID;

/** Rejects access tokens whose session was revoked (logout, password reset) or whose user is no longer active. */
@Component
@RequiredArgsConstructor
public class ActiveSessionValidator implements OAuth2TokenValidator<Jwt> {

	public static final String SESSION_CLAIM = "sid";

	private static final OAuth2Error INVALID = new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN,
			"The session is no longer valid", null);

	private final AuthSessionRepository sessionRepository;
	private final Clock clock;

	@Override
	public OAuth2TokenValidatorResult validate(Jwt jwt) {
		try {
			UUID sessionId = UUID.fromString(jwt.getClaimAsString(SESSION_CLAIM));
			Long userId = Long.valueOf(jwt.getSubject());
			return sessionRepository.isActive(sessionId, userId, clock.instant())
					? OAuth2TokenValidatorResult.success()
					: OAuth2TokenValidatorResult.failure(INVALID);
		}
		catch (IllegalArgumentException | NullPointerException ex) {
			return OAuth2TokenValidatorResult.failure(INVALID);
		}
	}

}
