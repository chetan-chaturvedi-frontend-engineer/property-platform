package com.propertypro.property_platform.builderteam.exception;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public final class BuilderTeamExceptions {

	private BuilderTeamExceptions() {
	}

	/** Also for memberships that exist but are not visible to the caller, so ids cannot be probed. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "builder_team_member_not_found", "Team member not found.");
	}

	/** The caller can see the membership (or has none yet) but lacks the permission for this action. */
	public static ApiException actionForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "builder_team_action_forbidden",
				"You are not allowed to perform this action on this team member.");
	}

	/** Fields whose capability permission the caller does not hold. */
	public static ApiException fieldsForbidden(Collection<String> fields) {
		List<String> sorted = fields.stream().sorted().toList();
		return new ApiException(HttpStatus.FORBIDDEN, "builder_team_fields_forbidden",
				"You are not allowed to change: " + String.join(", ", sorted) + ".", Map.of("fields", sorted));
	}

	public static ApiException selfMembership() {
		return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "builder_team_self_membership",
				"A builder cannot be a member of their own team.");
	}

	public static ApiException duplicateMembership() {
		return new ApiException(HttpStatus.CONFLICT, "builder_team_duplicate_membership",
				"This user already has an open invitation or membership in this team.");
	}

	public static ApiException invalidStatusTransition(BuilderTeamStatus from, BuilderTeamStatus to) {
		return new ApiException(HttpStatus.CONFLICT, "builder_team_invalid_status_transition",
				"A " + from.getValue() + " membership cannot be moved to " + to.getValue() + ".",
				Map.of("status", from.getValue(), "requestedStatus", to.getValue()));
	}

	/** Role and permissions of rejected or revoked memberships are history and never change. */
	public static ApiException notEditable(BuilderTeamStatus status) {
		return new ApiException(HttpStatus.CONFLICT, "builder_team_member_not_editable",
				"The membership cannot be changed because it is " + status.getValue() + ".",
				Map.of("status", status.getValue()));
	}

}
