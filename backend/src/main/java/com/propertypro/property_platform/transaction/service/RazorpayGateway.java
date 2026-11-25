package com.propertypro.property_platform.transaction.service;

import com.propertypro.property_platform.transaction.exception.PaymentExceptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/** Razorpay REST calls (Orders API). Kept separate so tests replace it and never reach the network. */
@Slf4j
@Component
public class RazorpayGateway {

	private final RazorpayProperties properties;
	private final RestClient client;

	public RazorpayGateway(RazorpayProperties properties) {
		this.properties = properties;
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Duration.ofSeconds(5));
		factory.setReadTimeout(Duration.ofSeconds(10));
		this.client = RestClient.builder().baseUrl(properties.baseUrl()).requestFactory(factory).build();
	}

	/** Creates an order for {@code amountMinor} (paise) and returns its id. */
	@SuppressWarnings("unchecked")
	public String createOrder(long amountMinor, String currency, String receipt, Map<String, String> notes) {
		String credentials = properties.keyId() + ":" + properties.keySecret();
		String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
		try {
			Map<String, Object> response = client.post().uri("/orders")
				.header(HttpHeaders.AUTHORIZATION, "Basic " + basic)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("amount", amountMinor, "currency", currency, "receipt", receipt, "notes", notes))
				.retrieve().body(Map.class);
			Object id = response == null ? null : response.get("id");
			if (!(id instanceof String orderId) || orderId.isBlank()) {
				log.error("Razorpay order response had no id");
				throw PaymentExceptions.gatewayError();
			}
			return orderId;
		}
		catch (RestClientException ex) {
			log.error("Razorpay order creation failed: {}", ex.getMessage());
			throw PaymentExceptions.gatewayError();
		}
	}

}
