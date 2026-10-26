package com.propertypro.property_platform.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;

import java.time.Instant;

/**
 * List item. {@code wizardStep} is the first incomplete wizard step (7 = ready). {@code ownerId} and
 * {@code deletedAt} appear only in the admin list.
 */
public record PropertySummaryResponse(Long id, String slug, String projectName, String builderCompanyName,
		PropertyType propertyType, String city, String locality, String state, String pincode,
		ProjectStatus projectStatus, LegalApprovalStatus legalApprovalStatus, PublicationStatus publicationStatus,
		int wizardStep, long version, Instant createdAt, Instant updatedAt, Instant publishedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) Long ownerId,
		@JsonInclude(JsonInclude.Include.NON_NULL) Instant deletedAt) {

	public static PropertySummaryResponse forOwner(PropertyProjectSummary p) {
		return of(p, null, null);
	}

	public static PropertySummaryResponse forAdmin(PropertyProjectSummary p) {
		return of(p, p.getUserId(), p.getDeletedAt());
	}

	private static PropertySummaryResponse of(PropertyProjectSummary p, Long ownerId, Instant deletedAt) {
		return new PropertySummaryResponse(p.getId(), p.getSlug(), p.getProjectName(), p.getBuilderCompanyName(),
				p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(), p.getPincode(), p.getProjectStatus(),
				p.getLegalApprovalStatus(), p.getPublicationStatus(), p.getWizardStep(), p.getVersion(),
				p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(), ownerId, deletedAt);
	}

}
