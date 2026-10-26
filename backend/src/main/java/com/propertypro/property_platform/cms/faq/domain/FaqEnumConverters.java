package com.propertypro.property_platform.cms.faq.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class FaqEnumConverters {

	private FaqEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class FaqStatusConverter extends PersistableEnumConverter<FaqStatus> {

		public FaqStatusConverter() {
			super(FaqStatus.class);
		}

	}

}
