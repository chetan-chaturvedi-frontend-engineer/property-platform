package com.propertypro.property_platform.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Validation error on a single request field detected outside Bean Validation; rendered like
 * other validation errors (400 with an {@code errors} map).
 */
@Getter
public class FieldValidationException extends ApiException {

	private final String field;

	public FieldValidationException(String field, String message) {
		super(HttpStatus.BAD_REQUEST, "validation_failed", message);
		this.field = field;
	}

}
