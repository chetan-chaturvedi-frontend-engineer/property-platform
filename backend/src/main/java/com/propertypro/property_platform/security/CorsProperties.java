package com.propertypro.property_platform.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Browser origins allowed to call the API, e.g. the admin dashboard ({@code app.security.cors.*}). */
@ConfigurationProperties("app.security.cors")
public record CorsProperties(List<String> allowedOrigins) {

	public CorsProperties {
		allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
		// Credentials (the admin session cookies) are allowed, so every origin must be listed explicitly.
		if (allowedOrigins.stream().anyMatch(origin -> origin.contains("*"))) {
			throw new IllegalStateException("app.security.cors.allowed-origins must list explicit origins, not '*'");
		}
	}

}
