package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.NearbyPlaceType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** A nearby place; the distance is stored as entered and marked unverified ({@code manual}). */
@RejectUnknownFields
public record NearbyPlaceRequest(
		@NotBlank @Size(max = 150) String placeName,
		@NotNull @Pattern(regexp = NearbyPlaceType.VALUES, message = "must be a supported place type") String placeType,
		@NotNull @DecimalMin("0") @DecimalMax("99999.99") @Digits(integer = 5, fraction = 2) BigDecimal distanceKm,
		@DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 6) BigDecimal latitude,
		@DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 6) BigDecimal longitude) {
}
