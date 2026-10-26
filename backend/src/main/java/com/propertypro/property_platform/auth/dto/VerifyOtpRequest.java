package com.propertypro.property_platform.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
		@NotBlank @Size(max = 255) String identifier,
		@NotBlank @Pattern(regexp = "\\d{4,10}", message = "must be a numeric code") String otp,
		@NotBlank @Pattern(regexp = "email_verification|phone_verification",
				message = "must be email_verification or phone_verification") String purpose) {
}
