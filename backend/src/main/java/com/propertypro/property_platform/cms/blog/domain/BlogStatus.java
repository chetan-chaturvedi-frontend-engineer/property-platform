package com.propertypro.property_platform.cms.blog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Publication workflow; a published blog is public only once its {@code publishedAt} has passed.
 * Keep in sync with {@code chk_blogs_status}.
 */
@Getter
@RequiredArgsConstructor
public enum BlogStatus implements PersistableEnum {

	DRAFT("draft"),
	PUBLISH("publish");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "draft|publish";

	private final String value;

	public static BlogStatus fromValue(String value) {
		return PersistableEnum.fromValue(BlogStatus.class, value);
	}

}
