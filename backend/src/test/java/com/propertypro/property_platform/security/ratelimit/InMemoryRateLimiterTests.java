package com.propertypro.property_platform.security.ratelimit;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InMemoryRateLimiterTests {

	private final MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
	private final InMemoryRateLimiter limiter = new InMemoryRateLimiter(clock);
	private final RateLimit limit = new RateLimit(2, Duration.ofMinutes(1));

	@Test
	void allowsUpToLimitThenRejectsWithRetryAfter() {
		limiter.acquire("k", limit);
		limiter.acquire("k", limit);
		assertThatThrownBy(() -> limiter.acquire("k", limit))
			.isInstanceOfSatisfying(RateLimitExceededException.class,
					ex -> assertThat(ex.getRetryAfter()).isEqualTo(Duration.ofMinutes(1)));
		assertThatNoException().isThrownBy(() -> limiter.acquire("other", limit));
	}

	@Test
	void windowResetsAfterItExpires() {
		limiter.acquire("k", limit);
		limiter.acquire("k", limit);
		clock.advance(Duration.ofMinutes(1));
		assertThatNoException().isThrownBy(() -> limiter.acquire("k", limit));
	}

	@Test
	void checkDoesNotCount() {
		limiter.checkNotExceeded("k", limit);
		limiter.checkNotExceeded("k", limit);
		limiter.checkNotExceeded("k", limit);
		limiter.acquire("k", limit);
		limiter.acquire("k", limit);
		assertThatThrownBy(() -> limiter.checkNotExceeded("k", limit)).isInstanceOf(RateLimitExceededException.class);
	}

	private static final class MutableClock extends Clock {

		private Instant now;

		MutableClock(Instant now) {
			this.now = now;
		}

		void advance(Duration duration) {
			now = now.plus(duration);
		}

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneOffset getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(java.time.ZoneId zone) {
			return this;
		}

	}

}
