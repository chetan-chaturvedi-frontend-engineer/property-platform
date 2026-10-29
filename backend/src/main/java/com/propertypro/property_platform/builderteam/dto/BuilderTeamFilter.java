package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ONE_OF;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ROLE_FORMAT;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.SEARCH_MAX_LENGTH;

/**
 * Admin list filters from query parameters; all given filters must match. {@code search} matches the
 * employee's name, email (case-insensitive) or phone digits. Creation date bounds are inclusive.
 */
public record BuilderTeamFilter(
		@Size(max = SEARCH_MAX_LENGTH) String search,
		@Positive Long builderId,
		@Positive Long employeeId,
		@Size(max = Role.SLUG_MAX_LENGTH) @Pattern(regexp = Role.SLUG_PATTERN, message = ROLE_FORMAT) String role,
		@Pattern(regexp = BuilderTeamStatus.VALUES, message = ONE_OF) String status,
		Instant createdFrom,
		Instant createdTo) {
}
