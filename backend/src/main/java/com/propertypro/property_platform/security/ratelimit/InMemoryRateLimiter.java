package com.propertypro.property_platform.security.ratelimit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Fixed-window rate limiter held in this JVM. Limits are per instance: with several instances,
 * replace it with a shared store (e.g. Redis) implementation of {@link RateLimiter}.
 */
@Component
public class InMemoryRateLimiter implements RateLimiter {

	private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();
	private final Clock clock;

	public InMemoryRateLimiter(Clock clock) {
		this.clock = clock;
	}

	@Override
	public void acquire(String key, RateLimit limit) {
		Instant now = clock.instant();
		Window window = windows.compute(key, (k, current) -> {
			Window active = current == null || current.isExpired(now) ? new Window(now.plus(limit.window()), 0) : current;
			return new Window(active.resetAt(), active.count() + 1);
		});
		if (window.count() > limit.maxRequests()) {
			throw new RateLimitExceededException(Duration.between(now, window.resetAt()));
		}
	}

	@Override
	public void checkNotExceeded(String key, RateLimit limit) {
		Instant now = clock.instant();
		Window window = windows.get(key);
		if (window != null && !window.isExpired(now) && window.count() >= limit.maxRequests()) {
			throw new RateLimitExceededException(Duration.between(now, window.resetAt()));
		}
	}

	/** Clears all counters. Intended for tests. */
	public void reset() {
		windows.clear();
	}

	@Scheduled(fixedDelayString = "PT1M")
	void evictExpired() {
		Instant now = clock.instant();
		windows.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
	}

	private record Window(Instant resetAt, int count) {

		boolean isExpired(Instant now) {
			return !now.isBefore(resetAt);
		}

	}

}
