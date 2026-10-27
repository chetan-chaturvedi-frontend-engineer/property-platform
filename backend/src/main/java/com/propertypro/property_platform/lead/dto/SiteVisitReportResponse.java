package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.SiteVisitInterest;

/** @param duration minutes */
public record SiteVisitReportResponse(
		SiteVisitInterest interest,
		String visitNote,
		Integer duration,
		String visitedWith,
		String feedback,
		Integer rating,
		LeadUserResponse submittedBy) {
}
