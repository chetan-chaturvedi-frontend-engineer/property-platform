package com.propertypro.property_platform.otp.provider;

/**
 * Sends OTP codes by SMS to an E.164 number. Implementations return only after the provider
 * accepted the message, and throw {@link OtpDeliveryException} otherwise; they must never log the code.
 */
public interface SmsOtpProvider {

	void send(OtpMessage message) throws OtpDeliveryException;

}
