package com.propertypro.property_platform.cms.page.service;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.dto.PublicPageResponse;
import com.propertypro.property_platform.cms.page.dto.PublicPageSummaryResponse;
import com.propertypro.property_platform.cms.page.exception.PageExceptions;
import com.propertypro.property_platform.cms.page.repository.PageRepository;
import com.propertypro.property_platform.common.text.Slugs;
import com.propertypro.property_platform.common.web.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pages for the mobile app and website, without login. Every query filters on
 * {@code status = 'publish'} in the database, so drafts are never loaded (not even in counts), and
 * anything not published is a plain 404 that does not reveal whether it exists. The client chooses
 * the page number and size only, never the visibility rule or the order.
 */
@Service
@RequiredArgsConstructor
public class PublicPageService {

	/** Alphabetical; id breaks ties so equal headings stay stable across pages. */
	static final Sort ORDER = Sort.by(Sort.Order.asc("heading"), Sort.Order.asc("id"));

	private final PageRepository pageRepository;

	@Transactional(readOnly = true)
	public PageResponse<PublicPageSummaryResponse> list(Pageable pageable) {
		return PageResponse.of(pageRepository.findByStatus(PageStatus.PUBLISH,
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), ORDER)), PublicPageSummaryResponse::from);
	}

	@Transactional(readOnly = true)
	public PublicPageResponse get(String slug) {
		// A malformed slug can never match; skip the query and answer like any unknown page.
		if (slug.length() > Page.SLUG_MAX_LENGTH || !Slugs.isValid(slug)) {
			throw PageExceptions.notFound();
		}
		return pageRepository.findBySlugAndStatus(slug, PageStatus.PUBLISH)
			.map(PublicPageResponse::from)
			.orElseThrow(PageExceptions::notFound);
	}

}
