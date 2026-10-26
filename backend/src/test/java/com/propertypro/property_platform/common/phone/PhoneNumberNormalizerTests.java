package com.propertypro.property_platform.common.phone;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneNumberNormalizerTests {

	private final PhoneNumberNormalizer normalizer = new PhoneNumberNormalizer("IN");

	@ParameterizedTest
	@ValueSource(strings = { "9876543210", "98765 43210", "09876543210", "+91 98765-43210", "+919876543210" })
	void normalizesIndianFormatsToE164(String input) {
		assertThat(normalizer.normalize(input)).contains("+919876543210");
	}

	@ParameterizedTest
	@ValueSource(strings = { "+14155552671", "+1 (415) 555-2671" })
	void keepsInternationalNumbers(String input) {
		assertThat(normalizer.normalize(input)).contains("+14155552671");
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "12", "abc", "+91 12345", "+999999999999999999999999999999999" })
	void rejectsInvalidNumbers(String input) {
		assertThat(normalizer.normalize(input)).isEmpty();
	}

}
