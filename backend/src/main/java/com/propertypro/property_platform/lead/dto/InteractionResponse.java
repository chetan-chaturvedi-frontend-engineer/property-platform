package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.InteractionOutcome;
import com.propertypro.property_platform.lead.domain.InteractionType;

import java.time.Instant;

/** @param createdAt when it was recorded, which may be later than {@code interactionAt} */
public record InteractionResponse(
		Long id,
		Long leadId,
		InteractionType type,
		String note,
		LeadUserResponse interactedBy,
		Instant interactionAt,
		InteractionOutcome outcome,
		Instant nextFollowUpAt,
		Integer durationSeconds,
		Instant createdAt,
		Instant updatedAt) {
}
