package com.propertypro.property_platform.builderteam.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** Lifecycle of a builder team membership. Keep in sync with {@code chk_builder_teams_status}. */
@Getter
@RequiredArgsConstructor
public enum BuilderTeamStatus implements PersistableEnum {

	/** Invited; waiting for the employee to accept or reject. */
	PENDING("pending"),
	ACTIVE("active"),
	/** Temporarily disabled by the builder; grants nothing until reactivated. */
	INACTIVE("inactive"),
	REJECTED("rejected"),
	REVOKED("revoked");

	/** Accepted filter values, for {@code @Pattern}. */
	public static final String VALUES = "pending|active|inactive|rejected|revoked";

	/** Values a status change may request (builder or admin); pending and rejected are never requested. */
	public static final String REQUESTABLE_VALUES = "active|inactive|revoked";

	/** Rows covered by {@code uq_builder_teams_open_membership}. */
	public static final Set<BuilderTeamStatus> OPEN = Set.copyOf(EnumSet.of(PENDING, ACTIVE, INACTIVE));
	/** Rows counted against the subscription's team member limit. */
	public static final Set<BuilderTeamStatus> SEATS = Set.copyOf(EnumSet.of(PENDING, ACTIVE));

	private static final Map<BuilderTeamStatus, Set<BuilderTeamStatus>> TRANSITIONS = Map.of(
			PENDING, EnumSet.of(ACTIVE, REJECTED, REVOKED),
			ACTIVE, EnumSet.of(INACTIVE, REVOKED),
			INACTIVE, EnumSet.of(ACTIVE, REVOKED),
			REJECTED, EnumSet.noneOf(BuilderTeamStatus.class),
			REVOKED, EnumSet.noneOf(BuilderTeamStatus.class));

	private final String value;

	public static BuilderTeamStatus fromValue(String value) {
		return PersistableEnum.fromValue(BuilderTeamStatus.class, value);
	}

	/** An open invitation or a membership; at most one per builder and employee. */
	public boolean isOpen() {
		return OPEN.contains(this);
	}

	/** Counts against the team member limit. */
	public boolean usesSeat() {
		return SEATS.contains(this);
	}

	/** Rejected and revoked rows are final; a new invitation creates a new row. */
	public boolean canChangeTo(BuilderTeamStatus next) {
		return TRANSITIONS.get(this).contains(next);
	}

}
