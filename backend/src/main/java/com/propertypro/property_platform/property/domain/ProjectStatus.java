package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Construction progress, independent of publication and legal approval.
 * Keep in sync with {@code chk_property_projects_project_status}.
 */
@Getter
@RequiredArgsConstructor
public enum ProjectStatus implements PersistableEnum {

	UPCOMING("upcoming"),
	UNDER_CONSTRUCTION("under_construction"),
	READY_TO_MOVE("ready_to_move"),
	COMPLETED("completed"),
	ON_HOLD("on_hold"),
	CANCELLED("cancelled");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "upcoming|under_construction|ready_to_move|completed|on_hold|cancelled";

	private final String value;

	public static ProjectStatus fromValue(String value) {
		return PersistableEnum.fromValue(ProjectStatus.class, value);
	}

}
