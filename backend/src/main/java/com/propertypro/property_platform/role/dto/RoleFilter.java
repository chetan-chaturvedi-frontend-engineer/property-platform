package com.propertypro.property_platform.role.dto;

import com.propertypro.property_platform.role.domain.RoleStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Optional admin role list filters from query parameters; all given filters must match.
 *
 * @param search name, slug or description contains (case-insensitive)
 */
public record RoleFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = RoleStatus.VALUES, message = "must be a role status") String status) {
}
