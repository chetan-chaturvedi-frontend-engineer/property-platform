package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;

import java.time.Instant;

/** Published property in public search results. */
public record PublicPropertySummaryResponse(String slug, String projectName, String builderCompanyName,
		PropertyType propertyType, String city, String locality, String state, ProjectStatus projectStatus,
		Instant publishedAt) {

	public static PublicPropertySummaryResponse from(PropertyProjectSummary p) {
		return new PublicPropertySummaryResponse(p.getSlug(), p.getProjectName(), p.getBuilderCompanyName(),
				p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(), p.getProjectStatus(),
				p.getPublishedAt());
	}

}
