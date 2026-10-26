package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.common.exception.FieldValidationException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Tags are stored as a JSON array of normalized strings: trimmed, inner whitespace collapsed,
 * lowercase, duplicates removed (first occurrence kept), e.g. {@code [" Home  Loans", "home loans"]}
 * becomes {@code ["home loans"]}. Letters (any script), digits, spaces and {@code . _ & + # -}.
 */
final class BlogTags {

	private static final Pattern FORMAT = Pattern.compile("^[\\p{L}\\p{N}][\\p{L}\\p{N} ._&+#-]*$");
	private static final Pattern WHITESPACE = Pattern.compile("\\s+");

	private BlogTags() {
	}

	/** Normalized tags; null for none. Count and element size are checked by request validation. */
	static List<String> normalize(List<String> tags, String field) {
		if (tags == null) {
			return null;
		}
		Set<String> normalized = new LinkedHashSet<>();
		for (int i = 0; i < tags.size(); i++) {
			normalized.add(normalize(tags.get(i), field + "[" + i + "]"));
		}
		return normalized.isEmpty() ? null : new ArrayList<>(normalized);
	}

	/** One tag, e.g. a filter parameter; 400 for {@code field} when malformed. */
	static String normalize(String tag, String field) {
		String value = tag == null ? "" : WHITESPACE.matcher(tag.strip()).replaceAll(" ").toLowerCase(Locale.ROOT);
		if (value.length() > Blog.TAG_MAX_LENGTH || !FORMAT.matcher(value).matches()) {
			throw new FieldValidationException(field,
					"must be 1-" + Blog.TAG_MAX_LENGTH + " letters, digits, spaces or . _ & + # -");
		}
		return value;
	}

}
