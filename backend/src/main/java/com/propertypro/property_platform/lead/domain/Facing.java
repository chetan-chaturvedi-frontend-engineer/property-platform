package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Preferred property direction. Keep in sync with {@code chk_leads_facing}. */
@Getter
@RequiredArgsConstructor
public enum Facing implements PersistableEnum {

	NORTH("north"),
	SOUTH("south"),
	EAST("east"),
	WEST("west"),
	NORTH_EAST("north_east"),
	NORTH_WEST("north_west"),
	SOUTH_EAST("south_east"),
	SOUTH_WEST("south_west");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "north|south|east|west|north_east|north_west|south_east|south_west";

	private final String value;

	public static Facing fromValue(String value) {
		return PersistableEnum.fromValue(Facing.class, value);
	}

}
