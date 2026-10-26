package com.propertypro.property_platform.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Access-token signing and lifetimes ({@code app.security.jwt.*}). */
@ConfigurationProperties("app.security.jwt")
public record JwtProperties(
		/** HS256 signing key (JWT_SECRET). At least 32 bytes; never commit a real value. */
		String secret,
		String issuer,
		String audience,
		Duration accessTokenTtl,
		/** Absolute session lifetime; refresh tokens never outlive their session. */
		Duration refreshTokenTtl) {

	public JwtProperties {
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalStateException("app.security.jwt.secret (JWT_SECRET) must be set to at least 32 bytes");
		}
	}

}
