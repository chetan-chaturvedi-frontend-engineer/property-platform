package com.propertypro.property_platform.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Client IP for rate limiting. Relies on {@code server.forward-headers-strategy: native}, where
 * Tomcat only honours X-Forwarded-For from trusted internal proxies, so clients cannot spoof it.
 */
public final class ClientIp {

	private ClientIp() {
	}

	public static String of(HttpServletRequest request) {
		return request.getRemoteAddr();
	}

}
