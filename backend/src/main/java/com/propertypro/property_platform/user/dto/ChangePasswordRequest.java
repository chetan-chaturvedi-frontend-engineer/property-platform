package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.auth.validation.PasswordConfirmation;
import com.propertypro.property_platform.auth.validation.PasswordsMatch;
import com.propertypro.property_platform.auth.validation.StrongPassword;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code password} is the new password, as in registration and reset. */
@RejectUnknownFields
@PasswordsMatch
public record ChangePasswordRequest(
		@NotBlank @Size(max = 128) String currentPassword,
		@NotBlank @StrongPassword String password,
		@NotBlank String passwordConfirmation) implements PasswordConfirmation {
}
