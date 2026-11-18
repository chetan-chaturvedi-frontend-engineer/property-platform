package com.propertypro.property_platform.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.Set;

/**
 * HttpOnly session cookies of the admin dashboard ({@code app.security.auth-cookies.*}). The access token
 * cookie goes to {@code /api/v1/admin/**} only and the refresh token cookie only to the refresh endpoint.
 *
 * @param secure send cookies over HTTPS only; disable only for local development over plain HTTP
 * @param sameSite {@code Strict} (default) or {@code Lax}; {@code None} is refused, cookies must stay same-site
 */
@ConfigurationProperties("app.security.auth-cookies")
public record AuthCookieProperties(
		@DefaultValue("true") boolean secure,
		@DefaultValue("Strict") String sameSite,
		@DefaultValue("admin_access_token") String accessTokenName,
		@DefaultValue("admin_refresh_token") String refreshTokenName) {

	private static final Set<String> ALLOWED_SAME_SITE = Set.of("Strict", "Lax");

	public AuthCookieProperties {
		if (!ALLOWED_SAME_SITE.contains(sameSite)) {
			throw new IllegalStateException("app.security.auth-cookies.same-site must be Strict or Lax");
		}
		if (accessTokenName.isBlank() || refreshTokenName.isBlank() || accessTokenName.equals(refreshTokenName)) {
			throw new IllegalStateException("app.security.auth-cookies names must be set and different");
		}
	}

}
