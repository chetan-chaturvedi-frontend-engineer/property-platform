package com.propertypro.property_platform.property.dto;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A new property names its builder: {@code builderCompanyName}, or a linked {@code builderUserId} whose name
 * is used. Reported on {@code builderCompanyName}, together with the other field errors.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = BuilderNamed.Validator.class)
public @interface BuilderNamed {

	String message() default "must not be blank";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<BuilderNamed, CreatePropertyRequest> {

		@Override
		public boolean isValid(CreatePropertyRequest value, ConstraintValidatorContext context) {
			if (value == null || value.builderUserId() != null
					|| (value.builderCompanyName() != null && !value.builderCompanyName().isBlank())) {
				return true;
			}
			context.disableDefaultConstraintViolation();
			context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
				.addPropertyNode("builderCompanyName")
				.addConstraintViolation();
			return false;
		}

	}

}
