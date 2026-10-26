package com.propertypro.property_platform.cms.banner.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class BannerEnumConverters {

	private BannerEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class BannerStatusConverter extends PersistableEnumConverter<BannerStatus> {

		public BannerStatusConverter() {
			super(BannerStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class BannerLinkTypeConverter extends PersistableEnumConverter<BannerLinkType> {

		public BannerLinkTypeConverter() {
			super(BannerLinkType.class);
		}

	}

}
