package com.propertypro.property_platform.otp.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OtpDeliveryStatus implements PersistableEnum {

	PENDING("pending"),
	SENT("sent"),
	FAILED("failed");

	private final String value;

}
