package com.propertypro.property_platform.common.phone;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Normalizes phone numbers to E.164 (e.g. {@code +919876543210}). Numbers without a country code
 * are parsed with the configured default region.
 */
@Component
public class PhoneNumberNormalizer {

	private static final int MAX_INPUT_LENGTH = 32;

	private final PhoneNumberUtil util = PhoneNumberUtil.getInstance();
	private final String defaultRegion;

	public PhoneNumberNormalizer(@Value("${app.phone.default-region:IN}") String defaultRegion) {
		this.defaultRegion = defaultRegion;
	}

	/** Returns the E.164 form, or empty when the input is not a valid phone number. */
	public Optional<String> normalize(String input) {
		if (input == null || input.isBlank() || input.length() > MAX_INPUT_LENGTH) {
			return Optional.empty();
		}
		try {
			Phonenumber.PhoneNumber number = util.parse(input.trim(), defaultRegion);
			if (!util.isValidNumber(number)) {
				return Optional.empty();
			}
			return Optional.of(util.format(number, PhoneNumberUtil.PhoneNumberFormat.E164));
		}
		catch (NumberParseException ex) {
			return Optional.empty();
		}
	}

}
