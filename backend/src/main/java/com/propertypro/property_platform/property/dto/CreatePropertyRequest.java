package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.PropertyType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Step 1 (property details), which creates the draft. The owner is always the authenticated user;
 * slug and statuses are set by the server, so fields such as {@code userId} or {@code slug} are rejected.
 *
 * @param builderCompanyName required unless {@code builderUserId} is given; then the builder's name is used
 * @param builderUserId      admin dashboard only: an active user with the builder role
 * @param projectPhone       any common format; stored in E.164 (default region India)
 */
@RejectUnknownFields
@BuilderNamed
public record CreatePropertyRequest(
		@NotNull @Pattern(regexp = PropertyType.VALUES, message = "must be apartment, villa or commercial") String propertyType,
		@NotBlank @Size(max = 150) String projectName,
		@Size(max = 150) String builderCompanyName,
		@Positive Long builderUserId,
		@Size(max = 50) @Pattern(regexp = PropertyFieldRules.RERA, message = "must be a valid RERA number") String reraNumber,
		@Pattern(regexp = PropertyFieldRules.GSTIN, message = "must be a valid GSTIN") String gstNumber,
		@NotBlank @Email @Size(max = 255) String projectEmail,
		@NotBlank @Size(max = 32) @ValidPhone String projectPhone) {
}
