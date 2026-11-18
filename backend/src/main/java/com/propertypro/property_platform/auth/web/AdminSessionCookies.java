package com.propertypro.property_platform.auth.web;

import com.propertypro.property_platform.auth.service.IssuedTokens;
import com.propertypro.property_platform.security.AdminCookiePaths;
import com.propertypro.property_platform.security.AuthCookieProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

/**
 * Writes the admin dashboard's session as HttpOnly cookies, so page scripts can never read the tokens.
 * The access token cookie is limited to {@code /api/v1/admin} and the refresh token cookie to the refresh
 * endpoint; both are SameSite and, outside local development, Secure.
 */
@Component
@RequiredArgsConstructor
public class AdminSessionCookies {

	private final AuthCookieProperties properties;
	private final Clock clock;

	public void write(HttpServletResponse response, IssuedTokens tokens) {
		Duration refreshLifetime = Duration.between(clock.instant(), tokens.refreshTokenExpiresAt());
		add(response, properties.accessTokenName(), tokens.accessToken(), AdminCookiePaths.ADMIN_API,
				tokens.accessTokenTtl());
		add(response, properties.refreshTokenName(), tokens.refreshToken(), AdminCookiePaths.REFRESH,
				refreshLifetime.isNegative() ? Duration.ZERO : refreshLifetime);
	}

	/** Deletes both cookies (same name and path, expired). */
	public void clear(HttpServletResponse response) {
		add(response, properties.accessTokenName(), "", AdminCookiePaths.ADMIN_API, Duration.ZERO);
		add(response, properties.refreshTokenName(), "", AdminCookiePaths.REFRESH, Duration.ZERO);
	}

	public Optional<String> refreshToken(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return Optional.empty();
		}
		for (Cookie cookie : cookies) {
			if (properties.refreshTokenName().equals(cookie.getName()) && !cookie.getValue().isBlank()) {
				return Optional.of(cookie.getValue());
			}
		}
		return Optional.empty();
	}

	private void add(HttpServletResponse response, String name, String value, String path, Duration maxAge) {
		ResponseCookie cookie = ResponseCookie.from(name, value)
			.httpOnly(true)
			.secure(properties.secure())
			.sameSite(properties.sameSite())
			.path(path)
			.maxAge(maxAge)
			.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

}
