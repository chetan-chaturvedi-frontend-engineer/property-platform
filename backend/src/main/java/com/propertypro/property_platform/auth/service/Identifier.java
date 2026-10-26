package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;

/** A normalized login identifier: lowercase email or E.164 phone. */
public record Identifier(Type type, String value) {

	public enum Type {

		EMAIL(OtpChannel.EMAIL, OtpPurpose.EMAIL_VERIFICATION),
		PHONE(OtpChannel.SMS, OtpPurpose.PHONE_VERIFICATION);

		private final OtpChannel channel;
		private final OtpPurpose verificationPurpose;

		Type(OtpChannel channel, OtpPurpose verificationPurpose) {
			this.channel = channel;
			this.verificationPurpose = verificationPurpose;
		}

	}

	/** Email codes go by email, phone codes by SMS; never the other way round. */
	public OtpChannel channel() {
		return type.channel;
	}

	public OtpPurpose verificationPurpose() {
		return type.verificationPurpose;
	}

	@Override
	public String toString() {
		return "Identifier[" + type + "]";
	}

}
