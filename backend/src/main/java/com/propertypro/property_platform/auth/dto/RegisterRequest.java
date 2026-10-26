package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.auth.validation.PasswordConfirmation;
import com.propertypro.property_platform.auth.validation.PasswordsMatch;
import com.propertypro.property_platform.auth.validation.StrongPassword;
import com.propertypro.property_platform.common.validation.ValidPhone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Only these fields are bound. User type, status and verification flags are set by the server;
 * any such fields in the request body are ignored.
 */
@PasswordsMatch
public record RegisterRequest(
		@NotBlank @Size(min = 2, max = 150) String fullName,
		@NotBlank @Email @Size(max = 255) String email,
		@NotBlank @ValidPhone String phone,
		@NotBlank @StrongPassword String password,
		@NotBlank String passwordConfirmation) implements PasswordConfirmation {
}
