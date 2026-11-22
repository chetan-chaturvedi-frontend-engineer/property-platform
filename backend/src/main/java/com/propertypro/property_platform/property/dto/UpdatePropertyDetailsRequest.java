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
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Step 1 partial update. Per field: omitted ({@code null} here) keeps the saved value; an explicit
 * JSON {@code null} clears {@code reraNumber} and {@code gstNumber} and is rejected for the others.
 * The slug never changes when the project name does.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdatePropertyDetailsRequest {

	private Optional<@NotNull @Pattern(regexp = PropertyType.VALUES, message = "must be apartment, villa or commercial") String> propertyType;

	private Optional<@NotBlank @Size(max = 150) String> projectName;

	/** A typed name; it replaces a linked builder. */
	private Optional<@NotBlank @Size(max = 150) String> builderCompanyName;

	/**
	 * Admin dashboard only: links an active builder user, whose name becomes {@code builderCompanyName}.
	 * An explicit {@code null} removes the link and keeps the name.
	 */
	private Optional<@Positive Long> builderUserId;

	private Optional<@Size(max = 50) @Pattern(regexp = PropertyFieldRules.RERA, message = "must be a valid RERA number") String> reraNumber;

	private Optional<@Pattern(regexp = PropertyFieldRules.GSTIN, message = "must be a valid GSTIN") String> gstNumber;

	private Optional<@NotBlank @Email @Size(max = 255) String> projectEmail;

	private Optional<@NotBlank @Size(max = 32) @ValidPhone String> projectPhone;

}
