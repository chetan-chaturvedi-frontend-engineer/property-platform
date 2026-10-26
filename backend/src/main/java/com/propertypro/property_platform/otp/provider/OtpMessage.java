package com.propertypro.property_platform.otp.provider;

import com.propertypro.property_platform.otp.domain.OtpPurpose;

import java.time.Duration;

/** A code to deliver. {@link #toString()} redacts the code and destination. */
public record OtpMessage(String destination, String code, OtpPurpose purpose, Duration validFor) {

	@Override
	public String toString() {
		return "OtpMessage[purpose=" + purpose + "]";
	}

}
