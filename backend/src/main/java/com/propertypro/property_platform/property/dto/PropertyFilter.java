package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Optional list filters from query parameters; all given filters must match. {@code search} matches the
 * project name, builder or slug case-insensitively; city, state and locality match exactly (ignoring
 * case); date bounds are inclusive.
 *
 * @param ownerId admin list only
 * @param deleted admin list only: {@code exclude} (default), {@code only} or {@code include}
 */
public record PropertyFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = PropertyType.VALUES, message = "must be apartment, villa or commercial") String propertyType,
		@Size(max = 100) String city,
		@Size(max = 100) String state,
		@Size(max = 100) String locality,
		@Pattern(regexp = PropertyFieldRules.PINCODE, message = "must be a 6-digit PIN code") String pincode,
		@Pattern(regexp = ProjectStatus.VALUES, message = "must be a construction status") String projectStatus,
		@Pattern(regexp = PublicationStatus.VALUES, message = "must be a publication status") String publicationStatus,
		Instant createdFrom,
		Instant createdTo,
		Instant updatedFrom,
		Instant updatedTo,
		@Positive Long ownerId,
		@Pattern(regexp = "exclude|only|include", message = "must be exclude, only or include") String deleted) {
}
