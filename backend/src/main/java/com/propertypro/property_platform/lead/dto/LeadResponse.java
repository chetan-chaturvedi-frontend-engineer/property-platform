package com.propertypro.property_platform.lead.dto;

import com.propertypro.property_platform.lead.domain.Facing;
import com.propertypro.property_platform.lead.domain.Furnishing;
import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import com.propertypro.property_platform.lead.domain.ParkingPreference;
import com.propertypro.property_platform.lead.domain.PossessionTimeline;
import com.propertypro.property_platform.property.domain.AreaUnit;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record LeadResponse(
		Long id,
		LeadUserResponse createdBy,
		LeadUserResponse assignedTo,
		LeadSource source,
		LeadStatus status,
		LeadPriority priority,
		LeadPurpose purpose,
		String leadName,
		String phone,
		String alternatePhone,
		String email,
		LeadPropertyType propertyType,
		String bhk,
		BigDecimal budgetMin,
		BigDecimal budgetMax,
		String budgetCurrency,
		BigDecimal area,
		AreaUnit areaUnit,
		String preferredLocation,
		String location,
		PossessionTimeline possession,
		LocalDate moveInDate,
		String floorPreference,
		Facing facing,
		Furnishing furnishing,
		ParkingPreference parking,
		List<String> amenities,
		boolean loanRequired,
		String additionalNote,
		Instant lastContactedAt,
		Instant nextFollowUpAt,
		String lostReason,
		Instant createdAt,
		Instant updatedAt) {
}
