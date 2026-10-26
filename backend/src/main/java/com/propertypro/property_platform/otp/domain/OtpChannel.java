package com.propertypro.property_platform.otp.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OtpChannel implements PersistableEnum {

	EMAIL("email"),
	SMS("sms");

	private final String value;

}
