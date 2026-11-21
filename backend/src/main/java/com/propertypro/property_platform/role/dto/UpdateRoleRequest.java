package com.propertypro.property_platform.role.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.Optional;

/**
 * Partial update (PATCH): omitted fields keep their value; explicit {@code null} clears {@code description} and is
 * rejected for the others. {@code permissions} replaces every permission of the role. The slug is immutable, so it
 * is an unknown field (400).
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateRoleRequest {

	private Optional<@NotBlank @Size(min = 2, max = Role.NAME_MAX_LENGTH) String> name;

	private Optional<@Size(max = Role.DESCRIPTION_MAX_LENGTH) String> description;

	private Optional<@NotNull @Pattern(regexp = RoleStatus.VALUES, message = "must be a role status") String> status;

	private Optional<@NotNull @Size(max = Role.MAX_MODULES) Map<String, Map<String, Boolean>>> permissions;

}
