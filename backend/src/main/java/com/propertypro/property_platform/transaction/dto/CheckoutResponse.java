package com.propertypro.property_platform.transaction.dto;

/** What the app passes to the Razorpay checkout; {@code amount} is in paise (minor units). */
public record CheckoutResponse(String keyId, String orderId, long amount, String currency, String planTitle) {
}
