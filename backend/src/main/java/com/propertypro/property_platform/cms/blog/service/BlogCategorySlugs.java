package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.exception.BlogCategoryExceptions;
import com.propertypro.property_platform.cms.blog.repository.BlogCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assigns unique category slugs (see {@link UniqueSlugs}). Slugs of soft-deleted categories stay
 * reserved, so an old URL never points at another category. Both methods take
 * {@link BlogCategoryRepository#lockSlugs()} and must run in the transaction that saves the category.
 */
@Component
@RequiredArgsConstructor
class BlogCategorySlugs {

	private final BlogCategoryRepository categoryRepository;

	@Transactional(propagation = Propagation.MANDATORY)
	public String generate(String title) {
		categoryRepository.lockSlugs();
		return UniqueSlugs.fromTitle(title, BlogCategory.SLUG_MAX_LENGTH, "category", categoryRepository::isSlugTaken);
	}

	/** A client-chosen slug (format already validated): used as is, or 409 when any category has it. */
	@Transactional(propagation = Propagation.MANDATORY)
	public String requireAvailable(String slug) {
		categoryRepository.lockSlugs();
		if (categoryRepository.isSlugTaken(slug)) {
			throw BlogCategoryExceptions.slugTaken();
		}
		return slug;
	}

}
