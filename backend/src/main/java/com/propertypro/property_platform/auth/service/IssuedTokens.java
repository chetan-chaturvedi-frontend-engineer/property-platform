package com.propertypro.property_platform.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/** Freshly issued tokens. {@link #toString()} never prints them. */
public record IssuedTokens(Long userId, UUID sessionId, String accessToken, Duration accessTokenTtl,
		String refreshToken, Instant refreshTokenExpiresAt) {

	@Override
	public String toString() {
		return "IssuedTokens[userId=" + userId + "]";
	}

}
