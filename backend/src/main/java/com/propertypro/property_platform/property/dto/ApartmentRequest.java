package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.property.domain.ApartmentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * One apartment configuration (step 3). A full replacement: omitted optional fields are cleared or
 * reset to their defaults. Several configurations may share an {@code apartmentType}.
 *
 * @param id           only in a sync request: an existing configuration of the same property to update;
 *                     omit to create one
 * @param areaMin      advertised area range, in {@code areaUnit}; separate from the measurements below
 * @param displayOrder position in lists; in a sync request the item's position is used instead
 */
@RejectUnknownFields
public record ApartmentRequest(
		@Positive Long id,
		@NotBlank @Size(max = 100) String apartmentName,
		@NotNull @Pattern(regexp = ApartmentType.VALUES, message = "must be 1bhk, 2bhk, 3bhk, 4bhk or penthouse") String apartmentType,
		@NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal startingPrice,
		@Pattern(regexp = PropertyFieldRules.CURRENCY, message = "must be a 3-letter ISO 4217 code") String currency,
		@Size(max = PropertyFieldRules.DESCRIPTION_MAX_LENGTH) String description,
		@NotNull @Min(0) @Max(50) Integer bedrooms,
		@NotNull @Min(0) @Max(50) Integer bathrooms,
		@Min(0) @Max(50) Integer balconies,
		@Min(0) @Max(50) Integer carParking,
		@NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal areaMin,
		@NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal areaMax,
		@DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal carpetArea,
		@DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal balconyArea,
		@DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal builtUpArea,
		@DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal superBuiltUpArea,
		@Pattern(regexp = PropertyFieldRules.APARTMENT_AREA_UNIT, message = "must be sq_ft or sq_m") String areaUnit,
		@Size(max = PropertyFieldRules.MAX_HIGHLIGHTS)
		List<@NotBlank @Size(max = PropertyFieldRules.HIGHLIGHT_MAX_LENGTH) String> highlights,
		@Min(0) @Max(1000) Integer displayOrder) {
}
