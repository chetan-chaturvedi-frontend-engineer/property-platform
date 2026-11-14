package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Published property in public search results. {@code startingPrice} is the lowest starting price of its
 * apartment configurations (null when none), {@code apartmentTypes} their distinct types in display order
 * and {@code coverUrl} the primary photo, else the first photo (a public API path or an external URL).
 */
public record PublicPropertySummaryResponse(Long id, String slug, String projectName, String builderCompanyName,
		PropertyType propertyType, String city, String locality, String state, ProjectStatus projectStatus,
		BigDecimal startingPrice, List<ApartmentType> apartmentTypes, String coverUrl, Instant publishedAt) {
	public static PublicPropertySummaryResponse from(PropertyProjectSummary p, BigDecimal startingPrice,
			List<ApartmentType> apartmentTypes, String coverUrl) {
		return new PublicPropertySummaryResponse(p.getId(), p.getSlug(), p.getProjectName(),
				p.getBuilderCompanyName(), p.getPropertyType(), p.getCity(), p.getLocality(), p.getState(),
				p.getProjectStatus(), startingPrice, apartmentTypes, coverUrl, p.getPublishedAt());
	}
}
