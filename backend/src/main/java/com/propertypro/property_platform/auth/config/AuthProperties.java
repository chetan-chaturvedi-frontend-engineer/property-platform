package com.propertypro.property_platform.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/** User authentication settings ({@code app.auth.*}). */
@ConfigurationProperties("app.auth")
public record AuthProperties(
		PasswordPolicy password,
		/** Never-verified pending registrations are deleted after this, freeing their email and phone. */
		Duration pendingRegistrationRetention) {

	public record PasswordPolicy(int minLength, boolean requireUppercase, boolean requireLowercase,
			boolean requireDigit, boolean requireSpecial) {
	}

}
