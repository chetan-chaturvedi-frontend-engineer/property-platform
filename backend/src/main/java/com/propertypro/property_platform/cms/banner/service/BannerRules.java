package com.propertypro.property_platform.cms.banner.service;

import com.propertypro.property_platform.cms.banner.config.BannerProperties;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Banner rules beyond Bean Validation, checked on the final values before saving. Stricter than the
 * database checks, which remain the last line of defence.
 */
@Component
@RequiredArgsConstructor
class BannerRules {

	/** Root-relative path with an optional query; no fragment, backslash, whitespace or encoded path. */
	private static final Pattern INTERNAL_LINK = Pattern.compile("^/[A-Za-z0-9._~/-]*(\\?[A-Za-z0-9._~=&%+-]*)?$");
	private static final String INTERNAL_MESSAGE = "must be a path to an allowed app route, e.g. /offers";
	private static final String EXTERNAL_MESSAGE = "must be an https URL without credentials";

	private final BannerProperties properties;

	String requireType(String type) {
		return requireOneOf(type.strip(), properties.types(), "type");
	}

	String requirePlacement(String placement) {
		return requireOneOf(placement.strip(), properties.placements(), "placement");
	}

	/**
	 * Validates the link pair as it will be saved and returns the normalized link. Both null = no
	 * link; otherwise both are required. Internal links must stay inside an allowed app route, so a
	 * banner can never be used as an open redirect.
	 */
	String requireValidLink(BannerLinkType linkType, String link) {
		String value = link == null || link.isBlank() ? null : link.strip();
		if (linkType == null && value == null) {
			return null;
		}
		if (linkType == null) {
			throw new FieldValidationException("linkType", "is required when link is set");
		}
		if (value == null) {
			throw new FieldValidationException("link", "is required when linkType is set");
		}
		return linkType == BannerLinkType.INTERNAL ? requireInternal(value) : requireExternal(value);
	}

	/** Both bounds are inclusive and optional; the end may equal the start. */
	void requireValidSchedule(Instant startDate, Instant endDate) {
		if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
			throw new FieldValidationException("endDate", "must not be before startDate");
		}
	}

	private String requireInternal(String link) {
		if (!INTERNAL_LINK.matcher(link).matches()) {
			throw new FieldValidationException("link", INTERNAL_MESSAGE);
		}
		String path = link.split("\\?", 2)[0];
		// "//host" is protocol-relative (external); dot segments could climb out of the allowed route.
		boolean unsafe = path.contains("//") || Arrays.stream(path.split("/")).anyMatch(s -> s.equals(".") || s.equals(".."));
		boolean allowed = properties.internalLinkPrefixes().stream()
			.anyMatch(prefix -> "/".equals(prefix) ? "/".equals(path) : path.equals(prefix) || path.startsWith(prefix + "/"));
		if (unsafe || !allowed) {
			throw new FieldValidationException("link", INTERNAL_MESSAGE);
		}
		return link;
	}

	private static String requireExternal(String link) {
		// Exact lowercase scheme, so javascript:, data:, http: and mixed-case tricks are all rejected.
		if (!link.startsWith("https://") || link.chars().anyMatch(c -> c <= 0x20 || c == 0x7F || c == '\\')) {
			throw new FieldValidationException("link", EXTERNAL_MESSAGE);
		}
		try {
			URI uri = new URI(link);
			boolean valid = uri.getHost() != null && uri.getRawUserInfo() == null
					&& (uri.getPort() == -1 || uri.getPort() == 443);
			if (!valid) {
				throw new FieldValidationException("link", EXTERNAL_MESSAGE);
			}
			return link;
		}
		catch (URISyntaxException ex) {
			throw new FieldValidationException("link", EXTERNAL_MESSAGE);
		}
	}

	private static String requireOneOf(String value, List<String> allowed, String field) {
		if (!allowed.contains(value)) {
			throw new FieldValidationException(field, "must be one of " + String.join(", ", allowed));
		}
		return value;
	}

}
