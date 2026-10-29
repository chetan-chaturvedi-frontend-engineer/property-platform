package com.propertypro.property_platform.builderteam.dto;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.EMAIL_MAX_LENGTH;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.KEY_FORMAT;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_ACTIONS_PER_MODULE;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.MAX_MODULES;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.PHONE_INPUT_MAX_LENGTH;
import static com.propertypro.property_platform.builderteam.dto.BuilderTeamFieldRules.ROLE_FORMAT;

/**
 * App invitation to the caller's own team. The employee is identified by exactly one of {@code email} or
 * {@code phone} of their registered account; builder, inviter and status ({@code pending}) are set by the
 * server, and any other field is rejected.
 */
@RejectUnknownFields
public record CreateBuilderTeamMemberRequest(
		@Email @Size(max = EMAIL_MAX_LENGTH) String email,
		@Size(max = PHONE_INPUT_MAX_LENGTH) @ValidPhone String phone,
		@NotBlank @Size(max = Role.SLUG_MAX_LENGTH) @Pattern(regexp = Role.SLUG_PATTERN, message = ROLE_FORMAT) String role,
		@Size(max = MAX_MODULES)
		Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String,
				@NotNull @Size(max = MAX_ACTIONS_PER_MODULE)
				Map<@NotNull @Pattern(regexp = Role.KEY_PATTERN, message = KEY_FORMAT) String, @NotNull Boolean>> permissions,
		@Size(max = BuilderTeamMember.NOTES_MAX_LENGTH) String notes) {

	@AssertTrue(message = "exactly one of email or phone is required")
	boolean isEmployeeIdentified() {
		return (email == null || email.isBlank()) != (phone == null || phone.isBlank());
	}

}
