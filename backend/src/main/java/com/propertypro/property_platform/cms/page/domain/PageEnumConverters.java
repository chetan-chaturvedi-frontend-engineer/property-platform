package com.propertypro.property_platform.cms.page.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class PageEnumConverters {

	private PageEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class PageTypeConverter extends PersistableEnumConverter<PageType> {

		public PageTypeConverter() {
			super(PageType.class);
		}

	}

	@Converter(autoApply = true)
	public static class PageStatusConverter extends PersistableEnumConverter<PageStatus> {

		public PageStatusConverter() {
			super(PageStatus.class);
		}

	}

}
