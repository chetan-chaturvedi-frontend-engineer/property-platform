package com.propertypro.property_platform.auth.validation;

import com.propertypro.property_platform.auth.config.AuthProperties;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

	/** BCrypt ignores everything after 72 bytes. */
	private static final int MAX_BYTES = 72;

	private final AuthProperties.PasswordPolicy policy;

	public StrongPasswordValidator(AuthProperties properties) {
		this.policy = properties.password();
	}

	@Override
	public boolean isValid(String password, ConstraintValidatorContext context) {
		if (password == null) {
			return true;
		}
		List<String> missing = new ArrayList<>();
		if (password.length() < policy.minLength()) {
			missing.add("at least " + policy.minLength() + " characters");
		}
		if (policy.requireUppercase() && password.chars().noneMatch(Character::isUpperCase)) {
			missing.add("an uppercase letter");
		}
		if (policy.requireLowercase() && password.chars().noneMatch(Character::isLowerCase)) {
			missing.add("a lowercase letter");
		}
		if (policy.requireDigit() && password.chars().noneMatch(Character::isDigit)) {
			missing.add("a digit");
		}
		if (policy.requireSpecial() && password.chars().allMatch(Character::isLetterOrDigit)) {
			missing.add("a special character");
		}
		String message = missing.isEmpty() ? null : "must contain " + String.join(", ", missing);
		if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
			message = "must be at most " + MAX_BYTES + " bytes long";
		}
		if (message == null) {
			return true;
		}
		context.disableDefaultConstraintViolation();
		context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
		return false;
	}

}
