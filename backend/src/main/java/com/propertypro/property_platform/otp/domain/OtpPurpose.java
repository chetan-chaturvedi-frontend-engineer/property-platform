package com.propertypro.property_platform.otp.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** What a challenge proves. A code is only valid for its own purpose. */
@Getter
@RequiredArgsConstructor
public enum OtpPurpose implements PersistableEnum {

	EMAIL_VERIFICATION("email_verification"),
	PHONE_VERIFICATION("phone_verification"),
	PASSWORD_RESET("password_reset");

	private final String value;

	public static OtpPurpose fromValue(String value) {
		return PersistableEnum.fromValue(OtpPurpose.class, value);
	}

}
