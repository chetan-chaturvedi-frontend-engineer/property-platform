package com.propertypro.property_platform.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** The password must satisfy {@code app.auth.password}. Null is valid (combine with @NotBlank). */
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = StrongPasswordValidator.class)
public @interface StrongPassword {

	String message() default "does not meet the password policy";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
