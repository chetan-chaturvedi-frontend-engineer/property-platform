package com.propertypro.property_platform.security.ratelimit;

import java.time.Duration;

/** At most {@code maxRequests} per {@code window}. */
public record RateLimit(int maxRequests, Duration window) {

	public RateLimit {
		if (maxRequests < 1 || window == null || window.isNegative() || window.isZero()) {
			throw new IllegalArgumentException("Rate limit needs maxRequests >= 1 and a positive window");
		}
	}

}
