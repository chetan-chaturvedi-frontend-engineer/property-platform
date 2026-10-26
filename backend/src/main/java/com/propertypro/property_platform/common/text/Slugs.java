package com.propertypro.property_platform.common.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** URL slugs: lowercase ASCII letters and digits separated by single hyphens. */
public final class Slugs {

	private static final Pattern FORMAT = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
	private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");
	private static final Pattern APOSTROPHES = Pattern.compile("['’]");
	private static final Pattern SEPARATORS = Pattern.compile("[^a-z0-9]+");

	private Slugs() {
	}

	/**
	 * Converts text to a slug of at most {@code maxLength} characters, e.g. "Green Valley Résidency"
	 * becomes "green-valley-residency". Returns an empty string when nothing usable remains
	 * (for example, text in a non-Latin script).
	 */
	public static String slugify(String text, int maxLength) {
		if (text == null) {
			return "";
		}
		String ascii = COMBINING_MARKS.matcher(Normalizer.normalize(text, Normalizer.Form.NFKD)).replaceAll("");
		String lower = APOSTROPHES.matcher(ascii.toLowerCase(Locale.ROOT).replace("&", " and ")).replaceAll("");
		String slug = trimHyphens(SEPARATORS.matcher(lower).replaceAll("-"));
		return slug.length() <= maxLength ? slug : trimHyphens(slug.substring(0, maxLength));
	}

	public static boolean isValid(String slug) {
		return slug != null && FORMAT.matcher(slug).matches();
	}

	private static String trimHyphens(String value) {
		int start = 0;
		int end = value.length();
		while (start < end && value.charAt(start) == '-') {
			start++;
		}
		while (end > start && value.charAt(end - 1) == '-') {
			end--;
		}
		return value.substring(start, end);
	}

}
