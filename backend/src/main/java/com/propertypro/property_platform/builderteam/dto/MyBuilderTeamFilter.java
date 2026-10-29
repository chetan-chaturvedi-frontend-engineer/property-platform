package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ONE_OF;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ROLE_FORMAT;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.SEARCH_MAX_LENGTH;

/** App list filters; always within the caller's own team, so no filter can widen the scope. */
public record MyBuilderTeamFilter(
		@Size(max = SEARCH_MAX_LENGTH) String search,
		@Size(max = Role.SLUG_MAX_LENGTH) @Pattern(regexp = Role.SLUG_PATTERN, message = ROLE_FORMAT) String role,
		@Pattern(regexp = BuilderTeamStatus.VALUES, message = ONE_OF) String status) {
}
