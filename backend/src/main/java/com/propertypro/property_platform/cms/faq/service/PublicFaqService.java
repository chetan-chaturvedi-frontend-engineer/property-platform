package com.propertypro.property_platform.cms.faq.service;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.dto.FaqCategoryResponse;
import com.propertypro.property_platform.cms.faq.dto.PublicFaqFilter;
import com.propertypro.property_platform.cms.faq.dto.PublicFaqResponse;
import com.propertypro.property_platform.cms.faq.exception.FaqExceptions;
import com.propertypro.property_platform.cms.faq.repository.FaqRepository;
import com.propertypro.property_platform.cms.faq.repository.FaqSpecs;
import com.propertypro.property_platform.cms.faq.repository.PublicFaqs;
import com.propertypro.property_platform.common.web.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * FAQs for the mobile app and website, without login. Every FAQ query goes through
 * {@link PublicFaqs#visible}, so drafts and FAQs of removed categories are never returned (not even in
 * counts), and anything not visible is a plain 404 that does not reveal whether it exists. The client
 * chooses filters and page only, never the visibility rule or the order.
 */
@Service
@RequiredArgsConstructor
public class PublicFaqService {

	private final FaqRepository faqRepository;
	private final FaqProperties properties;

	@Transactional(readOnly = true)
	public PageResponse<PublicFaqResponse> list(PublicFaqFilter filter, Pageable pageable) {
		Specification<Faq> spec = PublicFaqs.visible(configured(), filter.category());
		if (filter.search() != null && !filter.search().isBlank()) {
			spec = spec.and(FaqSpecs.containing(filter.search()));
		}
		return PageResponse.of(faqRepository.findAll(spec,
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), PublicFaqs.ORDER)),
				faq -> PublicFaqResponse.from(faq, properties));
	}

	@Transactional(readOnly = true)
	public PublicFaqResponse get(Long id) {
		return faqRepository.findOne(PublicFaqs.visible(configured(), null).and(FaqSpecs.withId(id)))
			.map(faq -> PublicFaqResponse.from(faq, properties))
			.orElseThrow(FaqExceptions::notFound);
	}

	/** Configured categories in configuration order; no database access. */
	public List<FaqCategoryResponse> categories() {
		return properties.categories().entrySet().stream()
			.map(category -> new FaqCategoryResponse(category.getKey(), category.getValue()))
			.toList();
	}

	private Set<String> configured() {
		return properties.categories().keySet();
	}

}
