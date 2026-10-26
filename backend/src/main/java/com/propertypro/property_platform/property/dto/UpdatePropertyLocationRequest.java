package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Step 2 partial update; same omitted/null rules as {@link UpdatePropertyDetailsRequest}. Explicit null
 * clears {@code landmark}, {@code latitude} and {@code longitude}; after the update both coordinates
 * must be set or both empty. Coordinates are stored as given: they are not geocoded or verified.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdatePropertyLocationRequest {

	private Optional<@NotBlank @Size(max = 1000) String> projectAddress;

	private Optional<@NotBlank @Size(max = 100) String> city;

	private Optional<@NotBlank @Size(max = 100) String> locality;

	private Optional<@NotBlank @Pattern(regexp = PropertyFieldRules.PINCODE, message = "must be a 6-digit PIN code") String> pincode;

	private Optional<@NotBlank @Size(max = 100) String> state;

	private Optional<@Size(max = 150) String> landmark;

	private Optional<@DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 6) BigDecimal> latitude;

	private Optional<@DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 6) BigDecimal> longitude;

}
