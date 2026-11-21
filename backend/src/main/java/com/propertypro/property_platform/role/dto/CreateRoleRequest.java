package com.propertypro.property_platform.role.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * A new role. Only permissions from the catalog ({@code GET /admin/roles/permissions}) that the caller holds
 * may be granted.
 *
 * @param slug        lowercase words joined by hyphens; unique forever (deleted roles keep theirs) and immutable
 * @param status      defaults to active
 * @param permissions {@code {"<module>": {"<action>": true|false}}}; omitted means none
 */
@RejectUnknownFields
public record CreateRoleRequest(
		@NotBlank @Size(min = 2, max = Role.NAME_MAX_LENGTH) String name,
		@NotBlank @Size(min = 2, max = Role.SLUG_MAX_LENGTH)
		@Pattern(regexp = Role.SLUG_PATTERN, message = "must be lowercase letters, digits and single hyphens") String slug,
		@Size(max = Role.DESCRIPTION_MAX_LENGTH) String description,
		@Pattern(regexp = RoleStatus.VALUES, message = "must be a role status") String status,
		@Size(max = Role.MAX_MODULES) Map<String, Map<String, Boolean>> permissions) {
}
