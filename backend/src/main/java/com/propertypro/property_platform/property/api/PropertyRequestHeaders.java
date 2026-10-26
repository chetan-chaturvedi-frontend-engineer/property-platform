package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.service.PropertyMediaService.MediaContent;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Optimistic locking over HTTP: responses carry {@code ETag: "<version>"}, and write requests may send
 * it back in {@code If-Match}; a stale version is rejected with 409 instead of overwriting newer data.
 */
final class PropertyRequestHeaders {

	static final String IF_MATCH = "If-Match";
	static final String IDEMPOTENCY_KEY = "Idempotency-Key";

	private static final Pattern ETAG = Pattern.compile("^(?:W/)?\"?(\\d{1,18})\"?$");

	private PropertyRequestHeaders() {
	}

	/** The version in If-Match, or null when the header is absent. */
	static Long expectedVersion(String ifMatch) {
		if (ifMatch == null || ifMatch.isBlank()) {
			return null;
		}
		Matcher matcher = ETAG.matcher(ifMatch.strip());
		if (!matcher.matches()) {
			throw new FieldValidationException(IF_MATCH, "must be the property version, e.g. \"3\"");
		}
		return Long.valueOf(matcher.group(1));
	}

	static ResponseEntity<PropertyResponse> withEtag(HttpStatus status, PropertyResponse property) {
		return ResponseEntity.status(status).eTag(String.valueOf(property.version())).body(property);
	}

	/** Streams a stored file; PDFs download as attachments, images and videos display inline. */
	static ResponseEntity<org.springframework.core.io.Resource> file(MediaContent content, boolean cacheable) {
		boolean attachment = MediaType.APPLICATION_PDF_VALUE.equals(content.mimeType());
		ContentDisposition.Builder disposition = attachment ? ContentDisposition.attachment()
				: ContentDisposition.inline();
		if (content.filename() != null) {
			disposition.filename(content.filename(), StandardCharsets.UTF_8);
		}
		ResponseEntity.BodyBuilder response = ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(content.mimeType()))
			.header(HttpHeaders.CONTENT_DISPOSITION, disposition.build().toString())
			.cacheControl(cacheable ? CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic()
					: CacheControl.noStore());
		if (content.size() != null) {
			response.contentLength(content.size());
		}
		return response.body(content.resource());
	}

}
