package com.propertypro.property_platform.otp.provider;

/**
 * Delivery failed and may be retried. The message is logged, so it must never contain the code or
 * the destination.
 */
public class OtpDeliveryException extends Exception {

	public OtpDeliveryException(String message) {
		super(message);
	}

	public OtpDeliveryException(String message, Throwable cause) {
		super(message, cause);
	}

}
