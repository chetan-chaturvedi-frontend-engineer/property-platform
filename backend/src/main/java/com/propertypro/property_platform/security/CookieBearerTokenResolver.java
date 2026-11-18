package com.propertypro.property_platform.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Finds the access token in the {@code Authorization: Bearer} header (mobile app, API tools) or, for admin
 * endpoints only, in the admin dashboard's HttpOnly cookie. The header wins when both are present. Cookie
 * requests are protected against CSRF (see {@link SecurityConfig}).
 */
public class CookieBearerTokenResolver implements BearerTokenResolver {

	private final DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
	private final String cookieName;

	public CookieBearerTokenResolver(AuthCookieProperties properties) {
		this.cookieName = properties.accessTokenName();
	}

	@Override
	public String resolve(HttpServletRequest request) {
		String fromHeader = headerResolver.resolve(request);
		if (fromHeader != null) {
			return fromHeader;
		}
		// Before the CSRF check only the header counts, so cookie requests never escape CSRF protection.
		if (request.getAttribute(CsrfCheckedMarkerFilter.CSRF_CHECKED) == null) {
			return null;
		}
		String path = pathWithinApplication(request);
		if (!AdminCookiePaths.isAdminApi(path) || AdminCookiePaths.PUBLIC.contains(path)) {
			return null;
		}
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (cookieName.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
				return cookie.getValue();
			}
		}
		return null;
	}

	static String pathWithinApplication(HttpServletRequest request) {
		return request.getRequestURI().substring(request.getContextPath().length());
	}

}
