package com.propertypro.property_platform.transaction.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import com.propertypro.property_platform.subscription.domain.SubscriptionStatus;
import com.propertypro.property_platform.subscription.dto.UserSubscriptionResponse;
import com.propertypro.property_platform.subscription.exception.SubscriptionExceptions;
import com.propertypro.property_platform.subscription.exception.SubscriptionPlanExceptions;
import com.propertypro.property_platform.subscription.repository.SubscriptionPlanRepository;
import com.propertypro.property_platform.subscription.repository.UserSubscriptionRepository;
import com.propertypro.property_platform.subscription.service.UserSubscriptionService;
import com.propertypro.property_platform.transaction.domain.Payment;
import com.propertypro.property_platform.transaction.dto.CheckoutRequest;
import com.propertypro.property_platform.transaction.dto.CheckoutResponse;
import com.propertypro.property_platform.transaction.dto.PaymentResultResponse;
import com.propertypro.property_platform.transaction.dto.VerifyPaymentRequest;
import com.propertypro.property_platform.transaction.exception.PaymentExceptions;
import com.propertypro.property_platform.transaction.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_CREATE;

/**
 * Paying for a subscription plan with Razorpay: create an order, confirm it with the signed checkout result
 * (and, as a safety net when the app is closed mid-payment, the signed webhook), then activate the plan.
 * The amount is always the plan's price and a payment activates a plan at most once.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

	private final RazorpayProperties razorpay;
	private final RazorpayGateway gateway;
	private final SubscriptionPlanRepository planRepository;
	private final UserSubscriptionRepository subscriptionRepository;
	private final UserSubscriptionService subscriptionService;
	private final PaymentRepository paymentRepository;
	private final ObjectMapper objectMapper;
	private final Clock clock;

	/** Creates a Razorpay order for the plan. The order is created outside the DB transaction (no lock held on a remote call). */
	public CheckoutResponse checkout(CurrentActor actor, CheckoutRequest request) {
		if (!actor.has(SUBSCRIPTION_CREATE)) {
			throw SubscriptionExceptions.actionForbidden();
		}
		if (!razorpay.configured()) {
			throw PaymentExceptions.gatewayNotConfigured();
		}
		if (subscriptionRepository.findInForce(actor.userId(), SubscriptionStatus.ACTIVE, clock.instant())
			.isPresent()) {
			throw SubscriptionExceptions.alreadySubscribed();
		}
		SubscriptionPlan plan = planRepository.findById(request.planId())
			.orElseThrow(SubscriptionPlanExceptions::notFound);
		if (plan.getStatus() != SubscriptionPlanStatus.ACTIVE) {
			throw SubscriptionPlanExceptions.notAvailable();
		}
		if (plan.getPrice().signum() <= 0) {
			throw PaymentExceptions.paymentNotRequired();
		}
		long amountMinor = toMinorUnits(plan.getPrice());
		String receipt = "sub_" + UUID.randomUUID().toString().replace("-", "").substring(0, 30);
		String orderId = gateway.createOrder(amountMinor, plan.getCurrency(), receipt,
				Map.of("userId", String.valueOf(actor.userId()), "planId", String.valueOf(plan.getId())));
		paymentRepository.save(new Payment(actor.userId(), plan.getId(), orderId, plan.getPrice(), plan.getCurrency()));
		log.info("Payment order created userId={} planId={} orderId={}", actor.userId(), plan.getId(), orderId);
		return new CheckoutResponse(razorpay.keyId(), orderId, amountMinor, plan.getCurrency(), plan.getTitle());
	}

	/** Confirms the checkout result sent by the app and activates the plan. Only the order's owner can verify it. */
	@Transactional
	public PaymentResultResponse verify(CurrentActor actor, VerifyPaymentRequest request) {
		if (!razorpay.configured()) {
			throw PaymentExceptions.gatewayNotConfigured();
		}
		Payment payment = paymentRepository.findByProviderOrderIdForUpdate(request.razorpayOrderId())
			.filter(p -> p.getUserId().equals(actor.userId())).orElseThrow(PaymentExceptions::notFound);
		if (!RazorpaySignatures.validPayment(request.razorpayOrderId(), request.razorpayPaymentId(),
				request.razorpaySignature(), razorpay.keySecret())) {
			log.warn("Invalid payment signature userId={} orderId={}", actor.userId(), request.razorpayOrderId());
			throw PaymentExceptions.signatureInvalid();
		}
		return settle(payment, request.razorpayPaymentId());
	}

	/** Handles a Razorpay webhook. Returns false when the signature is wrong (the controller answers 400). */
	@Transactional
	public boolean handleWebhook(byte[] body, String signature) {
		if (!RazorpaySignatures.validWebhook(body, signature, razorpay.webhookSecret())) {
			return false;
		}
		JsonNode root = objectMapper.readTree(body);
		String event = root.path("event").asString("");
		if (!event.equals("payment.captured") && !event.equals("order.paid")) {
			return true;
		}
		JsonNode entity = root.path("payload").path("payment").path("entity");
		String orderId = entity.path("order_id").asString("");
		String paymentId = entity.path("id").asString("");
		if (orderId.isEmpty() || paymentId.isEmpty()) {
			return true;
		}
		Optional<Payment> found = paymentRepository.findByProviderOrderIdForUpdate(orderId);
		if (found.isEmpty()) {
			log.warn("Webhook for unknown order orderId={}", orderId);
			return true;
		}
		Payment payment = found.get();
		if (entity.path("amount").asLong(-1) != toMinorUnits(payment.getAmount())
				|| !payment.getCurrency().equals(entity.path("currency").asString(""))) {
			log.error("Webhook amount mismatch orderId={} paymentId={}", orderId, paymentId);
			return true;
		}
		settle(payment, paymentId);
		return true;
	}

	/** Marks the payment paid and activates the plan; repeating it (verify, then webhook) changes nothing. */
	private PaymentResultResponse settle(Payment payment, String paymentId) {
		if (payment.isPaid()) {
			return new PaymentResultResponse("paid", currentSubscription(payment.getUserId()));
		}
		payment.markPaid(paymentId, clock.instant());
		UserSubscriptionResponse subscription = null;
		try {
			subscription = subscriptionService.activateAfterPayment(payment.getUserId(), payment.getSubscriptionPlanId())
				.orElse(null);
		}
		catch (ApiException ex) {
			// Paid for a plan that was retired meanwhile: keep the payment, a human decides on a refund.
			log.error("Paid but not activated userId={} orderId={}: {}", payment.getUserId(),
					payment.getProviderOrderId(), ex.getCode());
		}
		if (subscription != null) {
			payment.linkSubscription(subscription.id());
		}
		else {
			log.warn("Payment settled without activation userId={} orderId={}", payment.getUserId(),
					payment.getProviderOrderId());
		}
		paymentRepository.save(payment);
		log.info("Payment settled userId={} orderId={} paymentId={}", payment.getUserId(),
				payment.getProviderOrderId(), paymentId);
		return new PaymentResultResponse("paid", subscription);
	}

	private UserSubscriptionResponse currentSubscription(Long userId) {
		return subscriptionRepository.findInForce(userId, SubscriptionStatus.ACTIVE, clock.instant())
			.map(UserSubscriptionResponse::from).orElse(null);
	}

	private static long toMinorUnits(BigDecimal amount) {
		return amount.movePointRight(2).longValueExact();
	}

}
