package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * The complete set of apartment configurations, saved atomically: items with an {@code id} update that
 * configuration, items without one are created, and existing configurations not listed are deleted
 * (soft delete). List order becomes the display order.
 */
@RejectUnknownFields
public record SyncApartmentsRequest(@NotNull @Size(max = 50) List<@NotNull @Valid ApartmentRequest> apartments) {
}
