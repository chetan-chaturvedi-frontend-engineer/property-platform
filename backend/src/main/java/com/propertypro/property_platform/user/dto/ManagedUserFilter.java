package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.user.domain.UserStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Optional admin user list filters from query parameters; all given filters must match.
 *
 * @param search      name or email contains (case-insensitive), or at least 3 digits of the phone number
 * @param userType    role slug
 * @param createdFrom first day included (UTC), ISO date
 * @param createdTo   last day included (UTC), ISO date; not before {@code createdFrom}
 */
public record ManagedUserFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = UserStatus.VALUES, message = "must be a user status") String status,
		@Size(max = Role.SLUG_MAX_LENGTH)
		@Pattern(regexp = Role.SLUG_PATTERN, message = "must be a role slug") String userType,
		LocalDate createdFrom,
		LocalDate createdTo) {
}
