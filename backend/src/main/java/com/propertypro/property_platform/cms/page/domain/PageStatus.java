package com.propertypro.property_platform.cms.page.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Publication switch; only published pages are public. Keep in sync with {@code chk_pages_status}.
 */
@Getter
@RequiredArgsConstructor
public enum PageStatus implements PersistableEnum {

	DRAFT("draft"),
	PUBLISH("publish");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "draft|publish";

	private final String value;

	public static PageStatus fromValue(String value) {
		return PersistableEnum.fromValue(PageStatus.class, value);
	}

}
