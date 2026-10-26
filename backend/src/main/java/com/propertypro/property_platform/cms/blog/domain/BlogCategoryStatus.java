package com.propertypro.property_platform.cms.blog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Visibility switch for public category lists. Keep in sync with {@code chk_blog_categories_status}. */
@Getter
@RequiredArgsConstructor
public enum BlogCategoryStatus implements PersistableEnum {

	ACTIVE("active"),
	INACTIVE("inactive");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "active|inactive";

	private final String value;

	public static BlogCategoryStatus fromValue(String value) {
		return PersistableEnum.fromValue(BlogCategoryStatus.class, value);
	}

}
