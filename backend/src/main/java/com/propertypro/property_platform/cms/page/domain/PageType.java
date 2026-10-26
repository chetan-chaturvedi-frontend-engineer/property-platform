package com.propertypro.property_platform.cms.page.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Kind of page; a label only, it grants no permissions and changes no routing. Keep in sync with
 * {@code chk_pages_type}.
 */
@Getter
@RequiredArgsConstructor
public enum PageType implements PersistableEnum {

	/** Regular content page managed by administrators. */
	STATIC("static"),
	/** Page the application relies on (e.g. terms shown at sign-up). */
	SYSTEM("system");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "static|system";

	private final String value;

	public static PageType fromValue(String value) {
		return PersistableEnum.fromValue(PageType.class, value);
	}

}
