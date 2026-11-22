package com.propertypro.property_platform.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.user.dto.UserSummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * A property with everything the wizard saves, grouped by step, plus its progress and status history.
 * {@code version} is the value for {@code If-Match}. {@code owner} and {@code deletedAt} appear only in
 * admin responses.
 */
public record PropertyResponse(Long id, String slug, long version, PublicationStatus publicationStatus,
		Details details, Location location, List<ApartmentResponse> apartments, ProjectInfo projectInfo,
		List<AmenityResponse> amenities, List<MediaResponse> media, String threeDTourUrl,
		List<NearbyPlaceResponse> nearbyPlaces, WizardResponse wizard, List<StatusChangeResponse> statusHistory,
		Instant createdAt, Instant updatedAt, Instant publishedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) UserSummary owner,
		@JsonInclude(JsonInclude.Include.NON_NULL) Instant deletedAt) {

	/**
	 * Step 1. {@code builderUserId} and {@code builder} (the linked builder account's current contact
	 * details; absent if that account was deleted) appear only in the admin view and only when linked.
	 */
	public record Details(PropertyType propertyType, String projectName, String builderCompanyName, String reraNumber,
			String gstNumber, String projectEmail, String projectPhone,
			@JsonInclude(JsonInclude.Include.NON_NULL) Long builderUserId,
			@JsonInclude(JsonInclude.Include.NON_NULL) UserSummary builder) {
	}

	/** Step 2. Coordinates are as entered, not geocoded. */
	public record Location(String projectAddress, String city, String locality, String pincode, String state,
			String landmark, BigDecimal latitude, BigDecimal longitude) {
	}

	/** Step 4. */
	public record ProjectInfo(Integer totalTowersBlocks, Integer totalUnitsFlats, ProjectStatus projectStatus,
			LegalApprovalStatus legalApprovalStatus, BigDecimal landArea, AreaUnit landAreaUnit,
			LocalDate possessionStartDate, LocalDate possessionEndDate, String projectDescription,
			List<String> projectHighlights) {
	}

}
