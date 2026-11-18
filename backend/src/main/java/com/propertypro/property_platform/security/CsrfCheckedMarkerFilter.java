package com.propertypro.property_platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs right after Spring Security's {@code CsrfFilter} and marks the request as CSRF-checked; only then
 * does {@link CookieBearerTokenResolver} accept the access token cookie.
 * <p>
 * Why: the resource server exempts every request with a resolvable bearer token from CSRF protection. If the
 * cookie counted as a bearer token during the CSRF check, cookie requests (the ones CSRF must protect) would
 * be exempt. Deliberately not a bean, so the servlet container does not register it a second time.
 */
class CsrfCheckedMarkerFilter extends OncePerRequestFilter {

	static final String CSRF_CHECKED = CsrfCheckedMarkerFilter.class.getName() + ".CHECKED";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		request.setAttribute(CSRF_CHECKED, Boolean.TRUE);
		chain.doFilter(request, response);
	}

}
