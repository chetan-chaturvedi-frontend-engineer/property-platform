package com.propertypro.property_platform.common.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Request bodies of the annotated type fail with a 400 validation error naming each JSON field the
 * type does not declare, instead of silently ignoring it. Use on requests where clients might try to
 * set protected values (owner, slug, statuses), so such attempts are visible rather than dropped.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface RejectUnknownFields {
}
