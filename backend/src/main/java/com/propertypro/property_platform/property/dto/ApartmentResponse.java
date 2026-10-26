package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.AreaUnit;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ApartmentResponse(Long id, String apartmentName, ApartmentType apartmentType, BigDecimal startingPrice,
		String currency, String description, int bedrooms, int bathrooms, int balconies, int carParking,
		BigDecimal areaMin, BigDecimal areaMax, BigDecimal carpetArea, BigDecimal balconyArea, BigDecimal builtUpArea,
		BigDecimal superBuiltUpArea, AreaUnit areaUnit, List<String> highlights, int displayOrder,
		List<AmenityResponse> amenities, List<MediaResponse> media, Instant createdAt, Instant updatedAt) {
}
