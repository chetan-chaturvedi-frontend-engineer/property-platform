package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import jakarta.validation.constraints.Pattern;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ONE_OF;

/** The caller's memberships in other builders' teams, e.g. {@code status=pending} for open invitations. */
public record MyMembershipFilter(@Pattern(regexp = BuilderTeamStatus.VALUES, message = ONE_OF) String status) {
}
