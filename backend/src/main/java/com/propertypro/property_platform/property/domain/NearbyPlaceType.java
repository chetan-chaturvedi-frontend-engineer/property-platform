package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Keep in sync with {@code chk_property_project_nearby_places_place_type}. */
@Getter
@RequiredArgsConstructor
public enum NearbyPlaceType implements PersistableEnum {

	SCHOOL("school"),
	HOSPITAL("hospital"),
	SHOPPING_MALL("shopping_mall"),
	METRO_STATION("metro_station"),
	RAILWAY_STATION("railway_station"),
	AIRPORT("airport"),
	BUS_STOP("bus_stop"),
	OTHER("other");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "school|hospital|shopping_mall|metro_station|railway_station|airport|bus_stop|other";

	private final String value;

	public static NearbyPlaceType fromValue(String value) {
		return PersistableEnum.fromValue(NearbyPlaceType.class, value);
	}

}
