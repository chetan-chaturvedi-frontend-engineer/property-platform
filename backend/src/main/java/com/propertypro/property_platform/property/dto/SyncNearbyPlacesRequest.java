package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The complete list of nearby places; replaces the saved list. */
@RejectUnknownFields
public record SyncNearbyPlacesRequest(@NotNull @Size(max = 30) List<@NotNull @Valid NearbyPlaceRequest> places) {
}
