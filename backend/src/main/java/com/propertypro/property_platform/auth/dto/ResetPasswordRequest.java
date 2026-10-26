package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.auth.validation.PasswordConfirmation;
import com.propertypro.property_platform.auth.validation.PasswordsMatch;
import com.propertypro.property_platform.auth.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** The OTP sent to {@code identifier} is the only proof of identity; no user id is accepted. */
@PasswordsMatch
public record ResetPasswordRequest(
		@NotBlank @Size(max = 255) String identifier,
		@NotBlank @Pattern(regexp = "\\d{4,10}", message = "must be a numeric code") String otp,
		@NotBlank @StrongPassword String password,
		@NotBlank String passwordConfirmation) implements PasswordConfirmation {
}
