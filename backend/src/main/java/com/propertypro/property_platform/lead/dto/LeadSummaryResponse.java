package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;

import java.math.BigDecimal;
import java.time.Instant;

/** A row of the lead lists. */
public record LeadSummaryResponse(
		Long id,
		LeadUserResponse createdBy,
		LeadUserResponse assignedTo,
		LeadSource source,
		LeadStatus status,
		LeadPriority priority,
		LeadPurpose purpose,
		String leadName,
		String phone,
		String email,
		LeadPropertyType propertyType,
		String bhk,
		BigDecimal budgetMin,
		BigDecimal budgetMax,
		String budgetCurrency,
		String preferredLocation,
		Instant lastContactedAt,
		Instant nextFollowUpAt,
		Instant createdAt,
		Instant updatedAt) {
}
