package com.propertypro.property_platform.transaction.service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

/** HMAC-SHA256 checks used by Razorpay for checkout results and webhooks. */
final class RazorpaySignatures {

	private RazorpaySignatures() {
	}

	/** Checkout result: HMAC of {@code orderId|paymentId} with the key secret. */
	static boolean validPayment(String orderId, String paymentId, String signature, String keySecret) {
		return matches(hmacHex((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8), keySecret), signature);
	}

	/** Webhook: HMAC of the raw request body with the webhook secret. */
	static boolean validWebhook(byte[] body, String signature, String webhookSecret) {
		return !webhookSecret.isBlank() && matches(hmacHex(body, webhookSecret), signature);
	}

	static String hmacHex(byte[] data, String secret) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			return HexFormat.of().formatHex(mac.doFinal(data));
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException("HmacSHA256 unavailable", ex);
		}
	}

	private static boolean matches(String expected, String actual) {
		return actual != null && MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
				actual.getBytes(StandardCharsets.UTF_8));
	}

}
