package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The only profile field an app user may change here; email and phone changes need re-verification. */
@RejectUnknownFields
public record UpdateProfileRequest(@NotBlank @Size(min = 2, max = 150) String fullName) {
}
