package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;

import java.time.Instant;
import java.util.Map;

/**
 * A team membership. {@code invitedBy} is the account that created it ({@code builder_teams.user_id}).
 * {@code notes} is internal: null in the employee's own view.
 */
public record BuilderTeamMemberResponse(Long id, TeamUserResponse builder, TeamUserResponse employee,
		TeamUserResponse invitedBy, String role, Map<String, Map<String, Boolean>> permissions,
		BuilderTeamStatus status, Instant joinedAt, String notes, Instant createdAt, Instant updatedAt) {
}
