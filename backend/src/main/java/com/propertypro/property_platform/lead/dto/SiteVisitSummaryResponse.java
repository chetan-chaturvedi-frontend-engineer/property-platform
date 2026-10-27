package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.SiteVisitInterest;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import com.propertypro.property_platform.lead.domain.SiteVisitType;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** A site visit in a list; {@code interest} and {@code nextFollowUp} are null on rows where the caller is only the visitor. */
public record SiteVisitSummaryResponse(
		Long id,
		String visitCode,
		SiteVisitPropertyResponse property,
		LeadUserResponse builder,
		LeadUserResponse customer,
		LeadUserResponse assignee,
		SiteVisitType visitType,
		LocalDate visitDate,
		LocalTime visitTime,
		SiteVisitStatus status,
		String name,
		String mobile,
		int numberOfPeople,
		SiteVisitInterest interest,
		Instant nextFollowUp,
		Instant createdAt,
		Instant updatedAt) {
}
