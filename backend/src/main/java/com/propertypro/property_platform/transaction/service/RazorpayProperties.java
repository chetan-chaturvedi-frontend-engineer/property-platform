package com.propertypro.property_platform.transaction.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Razorpay settings ({@code app.razorpay.*}). Payments stay unavailable (503) until the key id and secret are set.
 *
 * @param keyId         public key id, also returned to the app for the checkout
 * @param keySecret     private key; signs payment verification, never leaves the server
 * @param webhookSecret secret configured on the Razorpay webhook; the webhook is refused while it is blank
 */
@ConfigurationProperties("app.razorpay")
public record RazorpayProperties(@DefaultValue("") String keyId, @DefaultValue("") String keySecret,
		@DefaultValue("") String webhookSecret, @DefaultValue("https://api.razorpay.com/v1") String baseUrl) {

	public boolean configured() {
		return !keyId.isBlank() && !keySecret.isBlank();
	}

}
