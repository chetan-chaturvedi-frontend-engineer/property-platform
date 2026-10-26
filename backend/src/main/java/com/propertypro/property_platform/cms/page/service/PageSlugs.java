package com.propertypro.property_platform.cms.page.service;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.exception.PageExceptions;
import com.propertypro.property_platform.cms.page.repository.PageRepository;
import com.propertypro.property_platform.common.text.Slugs;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assigns unique page slugs, same policy as blogs: "about-us", then "about-us-2", "about-us-3", ...
 * Both methods take {@link PageRepository#lockSlugs()} and must run in the transaction that saves the page.
 */
@Component
@RequiredArgsConstructor
class PageSlugs {

	/** Room kept for a "-<number>" suffix within the slug column. */
	private static final int SUFFIX_RESERVE = 15;

	private final PageRepository pageRepository;

	@Transactional(propagation = Propagation.MANDATORY)
	public String generate(String heading) {
		pageRepository.lockSlugs();
		String slug = Slugs.slugify(heading, Page.SLUG_MAX_LENGTH - SUFFIX_RESERVE);
		// Headings without Latin letters or digits, e.g. in another script.
		String base = slug.isEmpty() ? "page" : slug;
		String candidate = base;
		for (int n = 2; pageRepository.existsBySlug(candidate); n++) {
			candidate = base + "-" + n;
		}
		return candidate;
	}

	/**
	 * A client-chosen slug (format already validated): used as is, or 409 when another page has it.
	 *
	 * @param pageId the page being updated, or null on create
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public String requireAvailable(String slug, Long pageId) {
		pageRepository.lockSlugs();
		boolean taken = pageId == null ? pageRepository.existsBySlug(slug)
				: pageRepository.existsBySlugAndIdNot(slug, pageId);
		if (taken) {
			throw PageExceptions.slugTaken();
		}
		return slug;
	}

}
