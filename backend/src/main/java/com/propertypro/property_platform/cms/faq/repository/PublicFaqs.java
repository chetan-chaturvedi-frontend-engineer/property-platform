package com.propertypro.property_platform.cms.faq.repository;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;

/**
 * The single public visibility rule, used by every public FAQ query, so drafts are never exposed.
 */
public final class PublicFaqs {

	/** Display order everywhere (public and admin); id breaks ties so equal sort orders stay stable. */
	public static final Sort ORDER = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("id"));

	private PublicFaqs() {
	}

	/**
	 * Published FAQs in a configured category; FAQs of a category removed from the configuration are
	 * hidden instead of failing. Served by {@code idx_faqs_status_category_sort_order}.
	 *
	 * @param configuredCategories {@code FaqProperties.categories().keySet()}
	 * @param category             only this category; null = all configured categories
	 */
	public static Specification<Faq> visible(Collection<String> configuredCategories, String category) {
		return (root, query, cb) -> {
			if (category != null && !configuredCategories.contains(category)) {
				return cb.disjunction();
			}
			return cb.and(
					cb.equal(root.get("status"), FaqStatus.PUBLISH),
					category != null
							? cb.equal(root.get("category"), category)
							: root.get("category").in(configuredCategories));
		};
	}

}
