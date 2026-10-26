package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Legal approval decision by a reviewer; {@code reason} is required when rejecting. */
@RejectUnknownFields
public record LegalStatusRequest(
		@NotNull @Pattern(regexp = LegalApprovalStatus.VALUES,
				message = "must be pending, approved, rejected or not_applicable") String status,
		@Size(max = 1000) String reason) {
}
