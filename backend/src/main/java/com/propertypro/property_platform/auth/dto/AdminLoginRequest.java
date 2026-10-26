package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Admin-panel login. {@code identifier} is an email address or a phone number, as for the app login.
 * Any other field (e.g. {@code role}, {@code userType}, {@code permissions}) is rejected: access
 * comes only from the role stored for the account.
 */
@RejectUnknownFields
public record AdminLoginRequest(
		@NotBlank @Size(max = 255) String identifier,
		@NotBlank @Size(max = 128) String password) {
}
