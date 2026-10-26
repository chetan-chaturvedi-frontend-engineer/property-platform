package com.propertypro.property_platform.cms.banner.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Admin on/off switch; an active banner is still shown only inside its schedule. Keep in sync with
 * {@code chk_banners_status}.
 */
@Getter
@RequiredArgsConstructor
public enum BannerStatus implements PersistableEnum {

	ACTIVE("active"),
	INACTIVE("inactive");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "active|inactive";

	private final String value;

	public static BannerStatus fromValue(String value) {
		return PersistableEnum.fromValue(BannerStatus.class, value);
	}

}
