package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.KEY_FORMAT;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_ACTIONS_PER_MODULE;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_MODULES;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ONE_OF;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ROLE_FORMAT;

/**
 * Partial update; omitted fields keep their value, explicit {@code null} clears {@code notes} and is
 * rejected for the others. {@code role}, {@code permissions} and {@code status} each need their capability
 * permission (see {@code BuilderTeamService}); builder, employee and inviter never change, so they are
 * unknown fields here (400).
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateBuilderTeamMemberRequest {

	private Optional<@NotNull @Size(max = Role.SLUG_MAX_LENGTH)
			@Pattern(regexp = Role.SLUG_PATTERN, message = ROLE_FORMAT) String> role;

	/** Replaces all permissions. */
	private Optional<@NotNull @Size(max = MAX_MODULES)
			Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String,
					@NotNull @Size(max = MAX_ACTIONS_PER_MODULE)
					Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String, @NotNull Boolean>>> permissions;

	private Optional<@NotNull @Pattern(regexp = BuilderTeamStatus.REQUESTABLE_VALUES, message = ONE_OF) String> status;

	private Optional<@Size(max = BuilderTeamMember.NOTES_MAX_LENGTH) String> notes;

	/** Names of the fields present in the request, in declaration order. */
	public Set<String> presentFields() {
		Map<String, Optional<?>> fields = new LinkedHashMap<>();
		fields.put("role", role);
		fields.put("permissions", permissions);
		fields.put("status", status);
		fields.put("notes", notes);
		fields.values().removeIf(value -> value == null);
		return fields.keySet();
	}

}
