package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.PropertyAmenity;

public record AmenityResponse(Long id, String name, String slug, String category, String icon) {

	public static AmenityResponse from(PropertyAmenity amenity) {
		return new AmenityResponse(amenity.getId(), amenity.getName(), amenity.getSlug(), amenity.getCategory(),
				amenity.getIcon());
	}

}
