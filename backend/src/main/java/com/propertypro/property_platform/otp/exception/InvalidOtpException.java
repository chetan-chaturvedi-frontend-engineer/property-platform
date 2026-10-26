package com.propertypro.property_platform.otp.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * One generic error for unknown, wrong, expired, consumed, replaced and locked codes, so responses
 * do not reveal whether an account or challenge exists.
 */
public class InvalidOtpException extends ApiException {

	public InvalidOtpException() {
		super(HttpStatus.BAD_REQUEST, "invalid_otp", "The code is invalid or has expired.");
	}

}
