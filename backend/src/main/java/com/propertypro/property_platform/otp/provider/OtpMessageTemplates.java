package com.propertypro.property_platform.otp.provider;

final class OtpMessageTemplates {

	private OtpMessageTemplates() {
	}

	static String subject(OtpMessage message) {
		return switch (message.purpose()) {
			case EMAIL_VERIFICATION -> "Verify your email address";
			case PHONE_VERIFICATION -> "Verify your phone number";
			case PASSWORD_RESET -> "Reset your password";
		};
	}

	static String body(OtpMessage message) {
		return "Your verification code is " + message.code() + ". It expires in "
				+ message.validFor().toMinutes() + " minutes. Do not share this code with anyone. "
				+ "If you did not request it, you can ignore this message.";
	}

}
