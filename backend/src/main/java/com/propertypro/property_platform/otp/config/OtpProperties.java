package com.propertypro.property_platform.otp.config;

import com.propertypro.property_platform.security.ratelimit.RateLimit;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** OTP settings ({@code app.otp.*}). */
@ConfigurationProperties("app.otp")
public record OtpProperties(
		/** Key for hashing stored codes (OTP_HMAC_SECRET). At least 32 bytes. */
		String hmacSecret,
		int length,
		Duration ttl,
		int maxAttempts,
		Duration resendCooldown,
		/** Codes sent to one destination per window, across all purposes. */
		RateLimit destinationLimit,
		Delivery delivery) {

	public OtpProperties {
		if (hmacSecret == null || hmacSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalStateException("app.otp.hmac-secret (OTP_HMAC_SECRET) must be set to at least 32 bytes");
		}
		if (length < 4 || length > 10) {
			throw new IllegalStateException("app.otp.length must be between 4 and 10");
		}
	}

	public record Delivery(
			/** none (default), smtp, or log (dev profile only). */
			String emailProvider,
			/** none (default) or log (dev profile only). */
			String smsProvider,
			String emailFrom,
			int maxAttempts,
			Duration retryDelay) {
	}

}
