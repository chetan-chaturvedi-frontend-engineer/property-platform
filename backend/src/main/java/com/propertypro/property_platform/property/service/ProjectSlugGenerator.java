package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.text.Slugs;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

/**
 * Generates unique project slugs on the server, e.g. "green-valley-residency-pune", then
 * "green-valley-residency-pune-2" for the next project with the same name and city.
 * <p>
 * Must run in the transaction that inserts the project: it holds an advisory lock on the base
 * slug until commit, so concurrent creations wait instead of colliding. The unique index
 * {@code uq_property_projects_slug} remains the final guard.
 * <p>
 * Slugs are stable: they are set once at creation and not regenerated when the name changes.
 */
@Component
@RequiredArgsConstructor
public class ProjectSlugGenerator {

	static final int MAX_LENGTH = 180;
	// Leaves room for a "-<suffix>" within MAX_LENGTH.
	static final int MAX_BASE_LENGTH = 160;
	private static final int MAX_NUMBERED_ATTEMPTS = 50;
	private static final String FALLBACK = "project";
	private static final char[] ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789".toCharArray();

	private final SecureRandom random = new SecureRandom();
	private final PropertyProjectRepository projectRepository;

	@Transactional(propagation = Propagation.MANDATORY)
	public String generate(String projectName, String city) {
		String base = baseSlug(projectName, city);
		projectRepository.lockSlugBase(base);
		if (!projectRepository.existsBySlugIncludingDeleted(base)) {
			return base;
		}
		for (int n = 2; n < 2 + MAX_NUMBERED_ATTEMPTS; n++) {
			String candidate = base + "-" + n;
			if (!projectRepository.existsBySlugIncludingDeleted(candidate)) {
				return candidate;
			}
		}
		// Very common name: stop probing numbers and use a random suffix.
		String candidate;
		do {
			candidate = base + "-" + randomSuffix();
		} while (projectRepository.existsBySlugIncludingDeleted(candidate));
		return candidate;
	}

	/** Project name plus city, unless the name already ends with the city. */
	static String baseSlug(String projectName, String city) {
		String name = Slugs.slugify(projectName, MAX_BASE_LENGTH);
		String citySlug = Slugs.slugify(city, MAX_BASE_LENGTH);
		if (name.isEmpty()) {
			name = FALLBACK;
		}
		if (citySlug.isEmpty() || name.equals(citySlug) || name.endsWith("-" + citySlug)) {
			return name;
		}
		return Slugs.slugify(name + "-" + citySlug, MAX_BASE_LENGTH);
	}

	private String randomSuffix() {
		char[] suffix = new char[6];
		for (int i = 0; i < suffix.length; i++) {
			suffix[i] = ALPHABET[random.nextInt(ALPHABET.length)];
		}
		return new String(suffix);
	}

}
