package com.propertypro.property_platform.common.exception;

import com.propertypro.property_platform.security.ratelimit.RateLimitExceededException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.MismatchedInputException;
import tools.jackson.databind.exc.UnrecognizedPropertyException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final String INVALID_VALUE = "has an invalid value";
	private static final String NOT_ALLOWED = "is not allowed";

	@ExceptionHandler(FieldValidationException.class)
	ResponseEntity<ProblemDetail> handleFieldValidation(FieldValidationException ex) {
		return ResponseEntity.badRequest().body(validationProblem(Map.of(ex.getField(), ex.getMessage())));
	}

	@ExceptionHandler(RateLimitExceededException.class)
	ResponseEntity<ProblemDetail> handleRateLimit(RateLimitExceededException ex) {
		return ResponseEntity.status(ex.getStatus())
				.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfter().toSeconds()))
				.body(problem(ex));
	}

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ProblemDetail> handleApiException(ApiException ex) {
		return ResponseEntity.status(ex.getStatus()).body(problem(ex));
	}

	// Method-security failures must keep their status instead of falling into the 500 handler.
	@ExceptionHandler(AccessDeniedException.class)
	ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied."));
	}

	@ExceptionHandler(AuthenticationException.class)
	ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Authentication required."));
	}

	/** A concurrent transaction changed the same row first (JPA {@code @Version}). */
	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	ResponseEntity<ProblemDetail> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
				"The resource was changed by another request. Reload it and try again.");
		problem.setProperty("code", "concurrent_modification");
		return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
	}

	/** Entity constraints checked by Hibernate before writing; request validation normally catches these first. */
	@ExceptionHandler(ConstraintViolationException.class)
	ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException ex) {
		Map<String, String> errors = new LinkedHashMap<>();
		ex.getConstraintViolations().forEach(violation -> errors.putIfAbsent(
				violation.getPropertyPath().toString(), violation.getMessage()));
		return ResponseEntity.badRequest().body(validationProblem(errors));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
		log.error("Unexpected error", ex);
		return ResponseEntity.internalServerError()
				.body(ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred."));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		// Binding failures (e.g. "abc" for a number query parameter) carry a conversion message with Java types.
		ex.getBindingResult().getFieldErrors().forEach(error -> errors.putIfAbsent(error.getField(),
				error.isBindingFailure() ? INVALID_VALUE : error.getDefaultMessage()));
		return ResponseEntity.status(status).headers(headers).body(validationProblem(errors));
	}

	/**
	 * A JSON value of the wrong type (e.g. {@code "price": "abc"}) is reported as an error on that field,
	 * as is a field rejected by {@code @RejectUnknownFields}.
	 */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		if (ex.getCause() instanceof MismatchedInputException mismatch && !mismatch.getPath().isEmpty()) {
			String message = mismatch instanceof UnrecognizedPropertyException ? NOT_ALLOWED : INVALID_VALUE;
			return ResponseEntity.status(status).headers(headers)
					.body(validationProblem(Map.of(fieldPath(mismatch.getPath()), message)));
		}
		return super.handleHttpMessageNotReadable(ex, headers, status, request);
	}

	/** Same notation as Bean Validation field errors, e.g. {@code features[0]}. */
	private static String fieldPath(List<JacksonException.Reference> path) {
		StringBuilder field = new StringBuilder();
		for (JacksonException.Reference reference : path) {
			if (reference.getPropertyName() != null) {
				field.append(field.isEmpty() ? "" : ".").append(reference.getPropertyName());
			}
			else if (reference.getIndex() >= 0) {
				field.append('[').append(reference.getIndex()).append(']');
			}
		}
		return field.toString();
	}

	private static ProblemDetail validationProblem(Map<String, String> errors) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("code", "validation_failed");
		problem.setProperty("errors", errors);
		return problem;
	}

	private static ProblemDetail problem(ApiException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
		problem.setProperty("code", ex.getCode());
		ex.getProperties().forEach(problem::setProperty);
		return problem;
	}

}
