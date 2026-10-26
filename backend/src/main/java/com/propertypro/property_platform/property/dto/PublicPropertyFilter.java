package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Public search over published properties. Price bounds match properties with at least one apartment
 * configuration whose starting price is in range (and of {@code apartmentType}, when given).
 */
public record PublicPropertyFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = PropertyType.VALUES, message = "must be apartment, villa or commercial") String propertyType,
		@Size(max = 100) String city,
		@Size(max = 100) String state,
		@Size(max = 100) String locality,
		@Pattern(regexp = ProjectStatus.VALUES, message = "must be a construction status") String projectStatus,
		@Pattern(regexp = ApartmentType.VALUES, message = "must be 1bhk, 2bhk, 3bhk, 4bhk or penthouse") String apartmentType,
		@DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal minPrice,
		@DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal maxPrice) {
}
