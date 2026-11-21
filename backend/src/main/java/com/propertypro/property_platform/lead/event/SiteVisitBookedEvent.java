package com.propertypro.property_platform.lead.event;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Published inside the transaction that books a visit on a published property and delivered after commit, so the
 * builder and the visitor can be told. Carries display text only, no contact details.
 */
public record SiteVisitBookedEvent(Long visitId, String visitCode, Long propertyId, String projectName,
		Long builderId, Long visitorId, String visitorName, LocalDate visitDate, LocalTime visitTime) {
}
