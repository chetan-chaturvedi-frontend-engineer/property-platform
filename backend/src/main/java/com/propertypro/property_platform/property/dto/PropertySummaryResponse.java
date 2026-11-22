package com.propertypro.property_platform.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.user.dto.UserSummary;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * List item. {@code wizardStep} is the first incomplete wizard step (7 = ready). {@code ownerId},
 * {@code deletedAt} and the display extras appear only in the admin list; extras that have no value (no
 * configuration, no photo, never submitted) are omitted.
 */
public record PropertySummaryResponse(Long id, String slug, String projectName, String builderCompanyName,
		PropertyType propertyType, String city, String locality, String state, String pincode,
		ProjectStatus projectStatus, LegalApprovalStatus legalApprovalStatus, PublicationStatus publicationStatus,
		int wizardStep, long version, Instant createdAt, Instant updatedAt, Instant publishedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) Long ownerId,
		@JsonInclude(JsonInclude.Include.NON_NULL) Instant deletedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal startingPrice,
		@JsonInclude(JsonInclude.Include.NON_NULL) List<ApartmentType> apartmentTypes,
		@JsonInclude(JsonInclude.Include.NON_NULL) String coverUrl,
		@JsonInclude(JsonInclude.Include.NON_NULL) String ownerName,
		@JsonInclude(JsonInclude.Include.NON_NULL) String reraNumber,
		@JsonInclude(JsonInclude.Include.NON_NULL) String projectAddress,
		@JsonInclude(JsonInclude.Include.NON_NULL) Long mediaCount,
		@JsonInclude(JsonInclude.Include.NON_NULL) BigDecimal startingArea,
		@JsonInclude(JsonInclude.Include.NON_NULL) AreaUnit startingAreaUnit,
		@JsonInclude(JsonInclude.Include.NON_NULL) Integer carParkingMin,
		@JsonInclude(JsonInclude.Include.NON_NULL) Integer carParkingMax,
		@JsonInclude(JsonInclude.Include.NON_NULL) Instant submittedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) Long builderUserId,
		@JsonInclude(JsonInclude.Include.NON_NULL) UserSummary builder) {

	/**
	 * Admin list extras, all read in batch for a page.
	 *
	 * @param startingPrice    lowest starting price of the configurations, null when there are none
	 * @param apartmentTypes   distinct configuration types in display order
	 * @param coverUrl         primary photo, else the first photo (admin content path or external URL)
	 * @param ownerName        full name of the account that owns the listing
	 * @param mediaCount       project media files of every type (photos, videos, brochures)
	 * @param startingArea     minimum area of the configuration with the lowest starting price
	 * @param startingAreaUnit unit of {@code startingArea}
	 * @param carParkingMin    fewest car parking spaces of any configuration
	 * @param carParkingMax    most car parking spaces of any configuration
	 * @param submittedAt      latest submission for review
	 * @param builder          the linked builder account's current contact details (absent if deleted)
	 */
	public record AdminExtras(BigDecimal startingPrice, List<ApartmentType> apartmentTypes, String coverUrl,
			String ownerName, Long mediaCount, BigDecimal startingArea, AreaUnit startingAreaUnit,
			Integer carParkingMin, Integer carParkingMax, Instant submittedAt, UserSummary builder) {

		public static final AdminExtras NONE = new AdminExtras(null, List.of(), null, null, 0L, null, null, null,
				null, null, null);

	}

	public static PropertySummaryResponse forOwner(PropertyProjectSummary p) {
		return new PropertySummaryResponse(p.getId(), p.getSlug(), p.getProjectName(), p.getBuilderCompanyName(),
				p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(), p.getPincode(), p.getProjectStatus(),
				p.getLegalApprovalStatus(), p.getPublicationStatus(), p.getWizardStep(), p.getVersion(),
				p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(), null, null, null, null, null, null, null, null,
				null, null, null, null, null, null, null, null);
	}

	public static PropertySummaryResponse forAdmin(PropertyProjectSummary p, AdminExtras x) {
		return new PropertySummaryResponse(p.getId(), p.getSlug(), p.getProjectName(), p.getBuilderCompanyName(),
				p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(), p.getPincode(), p.getProjectStatus(),
				p.getLegalApprovalStatus(), p.getPublicationStatus(), p.getWizardStep(), p.getVersion(),
				p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(), p.getUserId(), p.getDeletedAt(),
				x.startingPrice(), x.apartmentTypes(), x.coverUrl(), x.ownerName(), p.getReraNumber(),
				p.getProjectAddress(), x.mediaCount(), x.startingArea(), x.startingAreaUnit(), x.carParkingMin(),
				x.carParkingMax(), x.submittedAt(), p.getBuilderUserId(), x.builder());
	}

}
