package com.propertypro.property_platform.common.validation;

import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class ValidPhoneValidator implements ConstraintValidator<ValidPhone, String> {

	private final PhoneNumberNormalizer phoneNumberNormalizer;

	@Override
	public boolean isValid(String value, ConstraintValidatorContext context) {
		return value == null || phoneNumberNormalizer.normalize(value).isPresent();
	}

}
