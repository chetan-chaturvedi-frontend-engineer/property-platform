package com.propertypro.property_platform.cms.banner.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * {@code internal} = root-relative app/website path, {@code external} = https URL. Keep in sync with
 * {@code chk_banners_link_type}.
 */
@Getter
@RequiredArgsConstructor
public enum BannerLinkType implements PersistableEnum {

	INTERNAL("internal"),
	EXTERNAL("external");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "internal|external";

	private final String value;

	public static BannerLinkType fromValue(String value) {
		return PersistableEnum.fromValue(BannerLinkType.class, value);
	}

}
