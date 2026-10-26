package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.common.text.Slugs;

import java.security.SecureRandom;
import java.util.function.Predicate;

/**
 * Unique slug from a title: "technology", then "technology-2", "technology-3", ... The caller holds
 * the table's slug lock while calling, and {@code taken} must include soft-deleted rows.
 */
final class UniqueSlugs {

	/** Room kept for a "-<suffix>" within the 255-character slug columns. */
	static final int SUFFIX_RESERVE = 15;
	private static final int MAX_NUMBERED_ATTEMPTS = 50;
	private static final char[] ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789".toCharArray();
	private static final SecureRandom RANDOM = new SecureRandom();

	private UniqueSlugs() {
	}

	/**
	 * @param fallback base for titles without Latin letters or digits, e.g. in another script
	 */
	static String fromTitle(String title, int maxLength, String fallback, Predicate<String> taken) {
		String slug = Slugs.slugify(title, maxLength - SUFFIX_RESERVE);
		String base = slug.isEmpty() ? fallback : slug;
		if (!taken.test(base)) {
			return base;
		}
		for (int n = 2; n < 2 + MAX_NUMBERED_ATTEMPTS; n++) {
			String candidate = base + "-" + n;
			if (!taken.test(candidate)) {
				return candidate;
			}
		}
		// Very common title: stop probing numbers and use a random suffix.
		String candidate;
		do {
			candidate = base + "-" + randomSuffix();
		} while (taken.test(candidate));
		return candidate;
	}

	private static String randomSuffix() {
		char[] suffix = new char[6];
		for (int i = 0; i < suffix.length; i++) {
			suffix[i] = ALPHABET[RANDOM.nextInt(ALPHABET.length)];
		}
		return new String(suffix);
	}

}
