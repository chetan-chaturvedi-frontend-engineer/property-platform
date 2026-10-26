package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.exception.BlogExceptions;
import com.propertypro.property_platform.cms.blog.repository.BlogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assigns unique blog slugs (see {@link UniqueSlugs}). Slugs of soft-deleted blogs stay reserved, so
 * an old URL never points at another post. Both methods take {@link BlogRepository#lockSlugs()} and
 * must run in the transaction that saves the blog.
 */
@Component
@RequiredArgsConstructor
class BlogSlugs {

	private final BlogRepository blogRepository;

	@Transactional(propagation = Propagation.MANDATORY)
	public String generate(String title) {
		blogRepository.lockSlugs();
		return UniqueSlugs.fromTitle(title, Blog.SLUG_MAX_LENGTH, "blog", blogRepository::isSlugTaken);
	}

	/** A client-chosen slug (format already validated): used as is, or 409 when any blog has it. */
	@Transactional(propagation = Propagation.MANDATORY)
	public String requireAvailable(String slug) {
		blogRepository.lockSlugs();
		if (blogRepository.isSlugTaken(slug)) {
			throw BlogExceptions.slugTaken();
		}
		return slug;
	}

}
