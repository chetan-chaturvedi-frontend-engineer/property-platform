package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Where a nearby-place distance came from; only {@code MAP_SERVICE} distances are calculated. */
@Getter
@RequiredArgsConstructor
public enum DistanceSource implements PersistableEnum {

	MANUAL("manual"),
	MAP_SERVICE("map_service");

	private final String value;

	public static DistanceSource fromValue(String value) {
		return PersistableEnum.fromValue(DistanceSource.class, value);
	}

}
