package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.DistanceSource;
import com.propertypro.property_platform.property.domain.NearbyPlaceType;
import com.propertypro.property_platform.property.domain.PropertyProjectNearbyPlace;

import java.math.BigDecimal;

/** {@code distanceSource} {@code manual} means the distance was entered by a person and is unverified. */
public record NearbyPlaceResponse(Long id, String placeName, NearbyPlaceType placeType, BigDecimal distanceKm,
		DistanceSource distanceSource, BigDecimal latitude, BigDecimal longitude) {

	public static NearbyPlaceResponse from(PropertyProjectNearbyPlace place) {
		return new NearbyPlaceResponse(place.getId(), place.getPlaceName(), place.getPlaceType(), place.getDistanceKm(),
				place.getDistanceSource(), place.getLatitude(), place.getLongitude());
	}

}
