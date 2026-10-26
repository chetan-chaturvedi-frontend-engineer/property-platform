package com.propertypro.property_platform.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Business error with a safe, client-facing message. Rendered as a {@code ProblemDetail} by
 * {@link GlobalExceptionHandler}; {@code code} is a stable machine-readable identifier.
 */
@Getter
public class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final String code;
	/** Extra ProblemDetail members, in order. Only the caller's own data; never other users'. */
	private final Map<String, Object> properties;

	public ApiException(HttpStatus status, String code, String message) {
		this(status, code, message, Map.of());
	}

	public ApiException(HttpStatus status, String code, String message, Map<String, Object> properties) {
		super(message);
		this.status = status;
		this.code = code;
		this.properties = Collections.unmodifiableMap(new LinkedHashMap<>(properties));
	}

}
