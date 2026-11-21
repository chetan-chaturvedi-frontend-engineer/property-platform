package com.propertypro.property_platform.subscription.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.subscription.dto.SubscribeRequest;
import com.propertypro.property_platform.subscription.dto.UserSubscriptionResponse;
import com.propertypro.property_platform.subscription.service.UserSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The caller's own subscription (mobile app). There is no id in the path: the owner always comes from the token.
 */
@RestController
@RequestMapping(path = "/api/v1/subscriptions", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "My subscription", description = "The caller's subscription")
@RequiredArgsConstructor
public class UserSubscriptionController {

	private final UserSubscriptionService userSubscriptionService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "My subscription (SUBSCRIPTION_VIEW)", description = """
			The subscription in force now. 404 when there is none.""")
	@GetMapping("/me")
	public UserSubscriptionResponse mine(CurrentActor actor) {
		return userSubscriptionService.mine(actor);
	}

	@Operation(summary = "Take a plan (SUBSCRIPTION_CREATE)", description = """
			Activates the plan from now on. Free plans at once; a paid plan is 403 payment_required unless the \
			server waives payment (dev profile, no gateway yet). 409 when a subscription is already active or the \
			plan is not available, 404 for an unknown plan.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public UserSubscriptionResponse subscribe(CurrentActor actor, @Valid @RequestBody SubscribeRequest request) {
		rateLimiter.acquire("subscription:write:user:" + actor.userId(), limits.userSubscriptionWriteUser());
		return userSubscriptionService.subscribe(actor, request);
	}

}
