package com.propertypro.property_platform.cms.faq.service;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FAQ rules beyond Bean Validation, checked before every create and update. The database checks
 * only the key format, so it cannot know which categories are configured.
 */
@Component
@RequiredArgsConstructor
public class FaqRules {

	private final FaqProperties properties;

	/** Returns the stripped key; rejects keys not in {@code app.faq.categories}. */
	public String requireCategory(String category) {
		String key = category == null ? null : category.strip();
		if (!properties.isConfigured(key)) {
			throw new FieldValidationException("category",
					"must be one of " + String.join(", ", properties.categories().keySet()));
		}
		return key;
	}

}
