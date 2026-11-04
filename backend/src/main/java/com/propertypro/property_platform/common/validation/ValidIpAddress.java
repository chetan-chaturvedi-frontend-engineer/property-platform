package com.propertypro.property_platform.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** The value must be an IPv4 or IPv6 address literal; host names and CIDR ranges are rejected. Null is valid. */
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.TYPE_USE })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidIpAddressValidator.class)
public @interface ValidIpAddress {

	String message() default "must be an IPv4 or IPv6 address";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
