package com.propertypro.property_platform.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResendOtpRequest(
		@NotBlank @Size(max = 255) String identifier,
		@NotBlank @Pattern(regexp = "email_verification|phone_verification|password_reset",
				message = "must be email_verification, phone_verification or password_reset") String purpose) {
}
