package com.propertypro.property_platform.security.ratelimit;

import com.propertypro.property_platform.common.exception.ApiException;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.Duration;

@Getter
public class RateLimitExceededException extends ApiException {

	private final Duration retryAfter;

	public RateLimitExceededException(Duration retryAfter) {
		super(HttpStatus.TOO_MANY_REQUESTS, "rate_limited", "Too many requests. Please try again later.");
		this.retryAfter = retryAfter.toSeconds() < 1 ? Duration.ofSeconds(1) : retryAfter;
	}

}
