package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import com.propertypro.property_platform.lead.domain.SiteVisitType;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Site visit details. Users are id and name only. For a caller who is only the visitor, the internal
 * sales fields ({@code leadId}, {@code report}, {@code nextFollowUp}, {@code followUpNote}) are null.
 *
 * @param customer the visitor's account; null for walk-ins
 * @param visitDate local date at the property
 * @param visitTime local time at the property
 */
public record SiteVisitResponse(
		Long id,
		String visitCode,
		SiteVisitPropertyResponse property,
		LeadUserResponse builder,
		LeadUserResponse customer,
		LeadUserResponse assignee,
		Instant assignedAt,
		LeadUserResponse scheduledBy,
		Long leadId,
		SiteVisitType visitType,
		LocalDate visitDate,
		LocalTime visitTime,
		SiteVisitStatus status,
		String name,
		String mobile,
		String email,
		int numberOfPeople,
		String note,
		Instant actualVisitDate,
		Instant cancelledAt,
		String cancellationReason,
		SiteVisitReportResponse report,
		Instant nextFollowUp,
		String followUpNote,
		Instant createdAt,
		Instant updatedAt) {
}
