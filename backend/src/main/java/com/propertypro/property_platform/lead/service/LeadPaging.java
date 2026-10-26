package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

/** Page requests for lead lists: only allow-listed sort properties, plus a stable tiebreaker. */
final class LeadPaging {

	private LeadPaging() {
	}

	/** @throws FieldValidationException for any sort property not in {@code sortable} */
	static PageRequest of(Pageable pageable, List<String> sortable) {
		for (Sort.Order order : pageable.getSort()) {
			if (!sortable.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", sortable));
			}
		}
		// Unique tiebreaker, so rows with equal sort values never repeat or go missing across pages.
		return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
	}

	static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
