package com.propertypro.property_platform.transaction.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Keep in sync with {@code chk_payments_status}. */
@Getter
@RequiredArgsConstructor
public enum PaymentStatus implements PersistableEnum {

	CREATED("created"),
	PAID("paid"),
	FAILED("failed");

	private final String value;

	public static PaymentStatus fromValue(String value) {
		return PersistableEnum.fromValue(PaymentStatus.class, value);
	}

}
