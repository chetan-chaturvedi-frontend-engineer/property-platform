package com.propertypro.property_platform.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * List item. {@code wizardStep} is the first incomplete wizard step (7 = ready). {@code ownerId},
 * {@code deletedAt} and the display extras ({@code startingPrice}, {@code apartmentTypes}, {@code coverUrl})
 * appear only in the admin list; extras that have no value (no configuration, no photo) are omitted.
 */
public record PropertySummaryResponse(Long id, String slug, String projectName, String builderCompanyName,
		PropertyType propertyType, String city, String locality, String state, String pincode,
		ProjectStatus projectStatus, LegalApprovalStatus legalApprovalStatus, PublicationStatus publicationStatus,
		int wizardStep, long version, Instant createdAt, Instant updatedAt, Instant publishedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) Long ownerId,
		@JsonInclude(JsonInclude.Include.NON_NULL) Instant deletedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal startingPrice,
		@JsonInclude(JsonInclude.Include.NON_NULL) List<ApartmentType> apartmentTypes,
		@JsonInclude(JsonInclude.Include.NON_NULL) String coverUrl) {

	public static PropertySummaryResponse forOwner(PropertyProjectSummary p) {
		return of(p, null, null, null, null, null);
	}

	/**
	 * @param startingPrice  lowest starting price of the configurations, null when there are none
	 * @param apartmentTypes distinct configuration types in display order
	 * @param coverUrl       primary photo, else the first photo (admin content path or external URL)
	 */
	public static PropertySummaryResponse forAdmin(PropertyProjectSummary p, BigDecimal startingPrice,
			List<ApartmentType> apartmentTypes, String coverUrl) {
		return of(p, p.getUserId(), p.getDeletedAt(), startingPrice, apartmentTypes, coverUrl);
	}

	private static PropertySummaryResponse of(PropertyProjectSummary p, Long ownerId, Instant deletedAt,
			BigDecimal startingPrice, List<ApartmentType> apartmentTypes, String coverUrl) {
		return new PropertySummaryResponse(p.getId(), p.getSlug(), p.getProjectName(), p.getBuilderCompanyName(),
				p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(), p.getPincode(), p.getProjectStatus(),
				p.getLegalApprovalStatus(), p.getPublicationStatus(), p.getWizardStep(), p.getVersion(),
				p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(), ownerId, deletedAt, startingPrice,
				apartmentTypes, coverUrl);
	}

}
