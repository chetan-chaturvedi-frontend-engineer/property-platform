package com.propertypro.property_platform.security.ratelimit;

/**
 * Counts requests per key in fixed windows. Keys must not contain secrets; they may contain
 * normalized identifiers and IPs, so implementations must not log them.
 */
public interface RateLimiter {

	/** Counts one request and throws if the limit for {@code key} is now exceeded. */
	void acquire(String key, RateLimit limit);

	/** Throws if {@code key} has already reached its limit, without counting a request. */
	void checkNotExceeded(String key, RateLimit limit);

}
