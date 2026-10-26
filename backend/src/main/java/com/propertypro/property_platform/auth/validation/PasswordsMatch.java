package com.propertypro.property_platform.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** {@code passwordConfirmation} must equal {@code password}; reported on {@code passwordConfirmation}. */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordsMatch.Validator.class)
public @interface PasswordsMatch {

	String message() default "must match password";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<PasswordsMatch, PasswordConfirmation> {

		@Override
		public boolean isValid(PasswordConfirmation value, ConstraintValidatorContext context) {
			if (value == null || value.password() == null || value.passwordConfirmation() == null
					|| value.password().equals(value.passwordConfirmation())) {
				return true;
			}
			context.disableDefaultConstraintViolation();
			context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
					.addPropertyNode("passwordConfirmation")
					.addConstraintViolation();
			return false;
		}

	}

}
