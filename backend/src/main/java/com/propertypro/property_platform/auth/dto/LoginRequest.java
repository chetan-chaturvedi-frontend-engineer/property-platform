package com.propertypro.property_platform.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code identifier} is an email address or a phone number. */
public record LoginRequest(
		@NotBlank @Size(max = 255) String identifier,
		@NotBlank @Size(max = 128) String password) {
}
