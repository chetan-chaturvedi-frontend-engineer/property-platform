package com.propertypro.property_platform.transaction.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class PaymentEnumConverters {

	private PaymentEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class PaymentStatusConverter extends PersistableEnumConverter<PaymentStatus> {

		public PaymentStatusConverter() {
			super(PaymentStatus.class);
		}

	}

}
