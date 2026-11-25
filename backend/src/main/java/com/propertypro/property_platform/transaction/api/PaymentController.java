package com.propertypro.property_platform.transaction.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.transaction.dto.CheckoutRequest;
import com.propertypro.property_platform.transaction.dto.CheckoutResponse;
import com.propertypro.property_platform.transaction.dto.PaymentResultResponse;
import com.propertypro.property_platform.transaction.dto.VerifyPaymentRequest;
import com.propertypro.property_platform.transaction.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Paying for a plan from the mobile app. */
@RestController
@RequestMapping(path = "/api/v1/subscriptions", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Subscription payments", description = "Razorpay checkout for paid plans")
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentService paymentService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Start a payment (SUBSCRIPTION_CREATE)", description = """
			Creates a Razorpay order for a paid plan and returns what the app passes to the Razorpay checkout \
			(amount in paise). 400 payment_not_required for a free plan, 409 when a subscription is already \
			active, 503 payments_unavailable while the gateway is not configured.""")
	@PostMapping(path = "/checkout", consumes = MediaType.APPLICATION_JSON_VALUE)
	public CheckoutResponse checkout(CurrentActor actor, @Valid @RequestBody CheckoutRequest request) {
		rateLimiter.acquire("subscription:write:user:" + actor.userId(), limits.userSubscriptionWriteUser());
		return paymentService.checkout(actor, request);
	}

	@Operation(summary = "Confirm a payment (SUBSCRIPTION_CREATE)", description = """
			Sends the Razorpay checkout result. The signature is verified on the server and the plan is activated. \
			Safe to repeat. 400 payment_signature_invalid, 404 payment_not_found (also for another user's order).""")
	@PostMapping(path = "/verify", consumes = MediaType.APPLICATION_JSON_VALUE)
	public PaymentResultResponse verify(CurrentActor actor, @Valid @RequestBody VerifyPaymentRequest request) {
		rateLimiter.acquire("subscription:write:user:" + actor.userId(), limits.userSubscriptionWriteUser());
		return paymentService.verify(actor, request);
	}

}
