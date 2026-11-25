package com.propertypro.property_platform.transaction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/** One gateway order for a paid plan. Becomes {@code paid} once, when the gateway confirms the payment. */
@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

	public static final String PROVIDER_RAZORPAY = "razorpay";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(name = "subscription_plan_id", nullable = false, updatable = false)
	private Long subscriptionPlanId;

	@Column(name = "user_subscription_id")
	private Long userSubscriptionId;

	@Column(nullable = false, updatable = false, length = 20)
	private String provider = PROVIDER_RAZORPAY;

	@Column(name = "provider_order_id", nullable = false, updatable = false, length = 64)
	private String providerOrderId;

	@Column(name = "provider_payment_id", length = 64)
	private String providerPaymentId;

	@Column(nullable = false, updatable = false, precision = 14, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false, updatable = false, length = 3)
	private String currency;

	@Column(nullable = false, length = 20)
	private PaymentStatus status = PaymentStatus.CREATED;

	@Column(name = "paid_at")
	private Instant paidAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	public Payment(Long userId, Long subscriptionPlanId, String providerOrderId, BigDecimal amount, String currency) {
		this.userId = userId;
		this.subscriptionPlanId = subscriptionPlanId;
		this.providerOrderId = providerOrderId;
		this.amount = amount;
		this.currency = currency;
	}

	public boolean isPaid() {
		return status == PaymentStatus.PAID;
	}

	public void markPaid(String providerPaymentId, Instant now) {
		this.status = PaymentStatus.PAID;
		this.providerPaymentId = providerPaymentId;
		this.paidAt = now;
	}

	public void linkSubscription(Long userSubscriptionId) {
		this.userSubscriptionId = userSubscriptionId;
	}

}
