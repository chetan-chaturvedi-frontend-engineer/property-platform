package com.propertypro.property_platform.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** The value must be an IANA time zone id, e.g. Asia/Kolkata or UTC; fixed offsets are rejected. Null is valid. */
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.TYPE_USE })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidTimeZoneValidator.class)
public @interface ValidTimeZone {

	String message() default "must be an IANA time zone, e.g. Asia/Kolkata";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
