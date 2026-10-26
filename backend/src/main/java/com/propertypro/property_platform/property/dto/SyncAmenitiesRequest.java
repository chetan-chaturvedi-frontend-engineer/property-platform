package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The complete set of linked amenities: ids of active catalog amenities, without duplicates. */
@RejectUnknownFields
public record SyncAmenitiesRequest(@NotNull @Size(max = 100) List<@NotNull @Positive Long> amenityIds) {
}
