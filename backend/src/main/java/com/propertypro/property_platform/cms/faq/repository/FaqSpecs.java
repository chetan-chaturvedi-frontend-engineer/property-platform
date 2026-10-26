package com.propertypro.property_platform.cms.faq.repository;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

/** Query building blocks shared by the admin and public FAQ queries; values are always bound parameters. */
public final class FaqSpecs {

	private FaqSpecs() {
	}

	/** Question or answer contains the text, case-insensitively; LIKE wildcards in it are literal. */
	public static Specification<Faq> containing(String text) {
		String pattern = "%" + escapeLike(text.strip().toLowerCase(Locale.ROOT)) + "%";
		return (root, query, cb) -> cb.or(cb.like(cb.lower(root.get("question")), pattern, '\\'),
				cb.like(cb.lower(root.get("answer")), pattern, '\\'));
	}

	public static Specification<Faq> withId(Long id) {
		return (root, query, cb) -> cb.equal(root.get("id"), id);
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
