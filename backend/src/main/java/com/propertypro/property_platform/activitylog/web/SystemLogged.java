package com.propertypro.property_platform.activitylog.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Sets the log text of a controller method. Writes are logged without it; a {@code GET} is only
 * logged with it, so put it on reads of sensitive data.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface SystemLogged {

	/** Human-readable description; defaults to one built from the controller and method names. */
	String action() default "";

	/** False for endpoints that store their own log, so a success does not log twice. Denials are still logged. */
	boolean logSuccess() default true;

}
