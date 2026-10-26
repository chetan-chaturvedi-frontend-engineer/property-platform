package com.propertypro.property_platform.common.exception;

import com.propertypro.property_platform.subscription.exception.SubscriptionExceptions;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTests {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

	@Test
	void propertyLimitProblemCarriesTheUsersOwnNumbers() {
		ResponseEntity<ProblemDetail> response = handler
			.handleApiException(SubscriptionExceptions.propertyLimitReached("Basic", 5, 5));

		assertThat(response.getStatusCode().value()).isEqualTo(403);
		ProblemDetail problem = response.getBody();
		assertThat(problem.getDetail())
			.isEqualTo("You have reached your property limit. Upgrade your subscription to add more properties.");
		assertThat(problem.getProperties()).containsEntry("code", "property_limit_reached")
			.containsEntry("plan", "Basic")
			.containsEntry("propertyLimit", 5)
			.containsEntry("currentProperties", 5L)
			.containsEntry("remainingProperties", 0L);
	}

	@Test
	void expiryAndMissingSubscriptionHaveTheirOwnCodes() {
		assertThat(handler.handleApiException(SubscriptionExceptions.subscriptionExpired()).getBody().getProperties())
			.containsExactly(java.util.Map.entry("code", "subscription_expired"));
		assertThat(handler.handleApiException(SubscriptionExceptions.subscriptionRequired()).getBody().getProperties())
			.containsExactly(java.util.Map.entry("code", "subscription_required"));
	}

}
