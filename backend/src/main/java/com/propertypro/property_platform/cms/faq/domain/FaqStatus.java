package com.propertypro.property_platform.cms.faq.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Publication switch; only published FAQs are public. Keep in sync with {@code chk_faqs_status}.
 */
@Getter
@RequiredArgsConstructor
public enum FaqStatus implements PersistableEnum {

	DRAFT("draft"),
	PUBLISH("publish");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "draft|publish";

	private final String value;

	public static FaqStatus fromValue(String value) {
		return PersistableEnum.fromValue(FaqStatus.class, value);
	}

}
