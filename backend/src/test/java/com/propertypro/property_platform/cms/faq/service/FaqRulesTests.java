package com.propertypro.property_platform.cms.faq.service;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FaqRulesTests {

	private final FaqProperties properties = new FaqProperties(categories("general", "General", "billing", "Billing"));
	private final FaqRules rules = new FaqRules(properties);

	@Test
	void acceptsConfiguredCategories() {
		assertThat(rules.requireCategory("general")).isEqualTo("general");
		assertThat(rules.requireCategory(" billing ")).isEqualTo("billing");
	}

	@ParameterizedTest
	@NullSource
	@ValueSource(strings = { "", "technical", "General", "removed_category" })
	void rejectsUnconfiguredCategories(String category) {
		assertThatThrownBy(() -> rules.requireCategory(category))
			.isInstanceOfSatisfying(FieldValidationException.class, ex -> assertThat(ex.getField()).isEqualTo("category"));
	}

	@Test
	void labelsKeepConfiguredOrderAndToleratesRemovedCategories() {
		assertThat(properties.categories().keySet()).containsExactly("general", "billing");
		assertThat(properties.label("billing")).contains("Billing");
		assertThat(properties.label("removed_category")).isEmpty();
		assertThat(properties.label(null)).isEmpty();
	}

	@Test
	void rejectsInvalidConfiguration() {
		assertThatThrownBy(() -> new FaqProperties(Map.of())).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new FaqProperties(null)).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new FaqProperties(Map.of("Billing Help", "Billing")))
			.isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new FaqProperties(Map.of("billing", " "))).isInstanceOf(IllegalStateException.class);
	}

	private static Map<String, String> categories(String... keysAndLabels) {
		Map<String, String> map = new LinkedHashMap<>();
		for (int i = 0; i < keysAndLabels.length; i += 2) {
			map.put(keysAndLabels[i], keysAndLabels[i + 1]);
		}
		return map;
	}

}
