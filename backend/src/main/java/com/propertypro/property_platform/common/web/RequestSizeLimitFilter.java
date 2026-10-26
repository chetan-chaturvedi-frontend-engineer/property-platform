package com.propertypro.property_platform.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Rejects JSON request bodies larger than {@code app.http.max-json-body-size} with 413 before
 * they are parsed. Paths starting with one of {@code app.http.large-json-body-paths} (e.g. admin
 * blog edits with long articles) use {@code app.http.max-large-json-body-size} instead. File uploads
 * use multipart limits.
 */
@Component
public class RequestSizeLimitFilter extends OncePerRequestFilter {

	private final long maxBytes;
	private final List<String> largeBodyPaths;
	private final long maxLargeBytes;

	public RequestSizeLimitFilter(@Value("${app.http.max-json-body-size:64KB}") DataSize maxSize,
			@Value("${app.http.large-json-body-paths:}") List<String> largeBodyPaths,
			@Value("${app.http.max-large-json-body-size:64KB}") DataSize maxLargeSize) {
		this.maxBytes = maxSize.toBytes();
		this.largeBodyPaths = largeBodyPaths.stream().filter(path -> !path.isBlank()).toList();
		this.maxLargeBytes = maxLargeSize.toBytes();
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String contentType = request.getContentType();
		boolean json = contentType != null && contentType.toLowerCase().startsWith(MediaType.APPLICATION_JSON_VALUE);
		if (json && request.getContentLengthLong() > limitFor(request.getRequestURI())) {
			response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
			response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
			response.getWriter().write("{\"status\":413,\"title\":\"Content Too Large\","
					+ "\"detail\":\"Request body is too large.\",\"code\":\"payload_too_large\"}");
			return;
		}
		chain.doFilter(request, response);
	}

	private long limitFor(String path) {
		return path != null && largeBodyPaths.stream().anyMatch(path::startsWith) ? maxLargeBytes : maxBytes;
	}

}
