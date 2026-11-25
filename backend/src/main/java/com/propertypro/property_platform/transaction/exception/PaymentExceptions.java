package com.propertypro.property_platform.transaction.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class PaymentExceptions {

	private PaymentExceptions() {
	}

	public static ApiException gatewayNotConfigured() {
		return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "payments_unavailable",
				"Online payments are not available right now.");
	}

	public static ApiException gatewayError() {
		return new ApiException(HttpStatus.BAD_GATEWAY, "payment_gateway_error",
				"The payment provider could not be reached. Try again in a moment.");
	}

	public static ApiException paymentNotRequired() {
		return new ApiException(HttpStatus.BAD_REQUEST, "payment_not_required",
				"This plan is free; take it without a payment.");
	}

	public static ApiException signatureInvalid() {
		return new ApiException(HttpStatus.BAD_REQUEST, "payment_signature_invalid",
				"The payment could not be verified.");
	}

	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "payment_not_found", "Payment not found.");
	}

}
