package com.propertypro.property_platform.cms.faq.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * FAQ settings ({@code app.faq.*}). The single source of truth for FAQ categories: there is no
 * categories table, so adding, renaming or removing one is only a configuration change.
 *
 * @param categories category key ({@code faqs.category}) to display label, in display order. Keys are
 *                   stable: renaming a key orphans its FAQs, so change the label instead
 */
@ConfigurationProperties("app.faq")
public record FaqProperties(Map<String, String> categories) {

	/** Same rule as {@code chk_faqs_category_format}. */
	private static final Pattern KEY = Pattern.compile("^[a-z][a-z0-9_]{0,49}$");

	public FaqProperties {
		if (categories == null || categories.isEmpty()) {
			throw new IllegalStateException("app.faq.categories must not be empty");
		}
		categories.forEach((key, label) -> {
			if (key == null || !KEY.matcher(key).matches()) {
				throw new IllegalStateException("app.faq.categories has an invalid key: " + key);
			}
			if (label == null || label.isBlank()) {
				throw new IllegalStateException("app.faq.categories." + key + " needs a label");
			}
		});
		categories = Collections.unmodifiableMap(new LinkedHashMap<>(categories));
	}

	public boolean isConfigured(String key) {
		return key != null && categories.containsKey(key);
	}

	/** Empty for a category that was removed from the configuration; never throws. */
	public Optional<String> label(String key) {
		return Optional.ofNullable(key).map(categories::get);
	}

}
