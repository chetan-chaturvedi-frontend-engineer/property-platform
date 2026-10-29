package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.Map;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.KEY_FORMAT;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_ACTIONS_PER_MODULE;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_MODULES;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ONE_OF;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ROLE_FORMAT;

/**
 * Admin creation of a membership in any builder's team. The inviter is the caller. {@code status}
 * {@code active} (added directly, without the employee accepting) needs {@code BUILDER_TEAM_MANAGE_STATUS};
 * omitted means {@code pending}.
 */
@RejectUnknownFields
public record AdminCreateBuilderTeamMemberRequest(
		@NotNull @Positive Long builderId,
		@NotNull @Positive Long employeeId,
		@NotBlank @Size(max = Role.SLUG_MAX_LENGTH) @Pattern(regexp = Role.SLUG_PATTERN, message = ROLE_FORMAT) String role,
		@Size(max = MAX_MODULES)
		Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String,
				@NotNull @Size(max = MAX_ACTIONS_PER_MODULE)
				Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String, @NotNull Boolean>> permissions,
		@Pattern(regexp = "pending|active", message = ONE_OF) String status,
		@Size(max = BuilderTeamMember.NOTES_MAX_LENGTH) String notes) {
}
