package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * A published property for the public website and app. Leaves out internal ids of the owner, GST
 * number, contact email and phone (enquiries go through leads), workflow and audit data.
 */
public record PublicPropertyResponse(Long id, String slug, PropertyType propertyType, String projectName,
		String builderCompanyName, String reraNumber, PropertyResponse.Location location,
		List<ApartmentResponse> apartments, Integer totalTowersBlocks, Integer totalUnitsFlats,
		ProjectStatus projectStatus, LegalApprovalStatus legalApprovalStatus, BigDecimal landArea,
		AreaUnit landAreaUnit, LocalDate possessionStartDate, LocalDate possessionEndDate, String projectDescription,
		List<String> projectHighlights, List<AmenityResponse> amenities, List<MediaResponse> media,
		String threeDTourUrl, List<NearbyPlaceResponse> nearbyPlaces, Instant publishedAt) {
}
