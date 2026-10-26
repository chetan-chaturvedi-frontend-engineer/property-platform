package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Every media id of the parent exactly once, in the new display order. */
@RejectUnknownFields
public record MediaOrderRequest(@NotNull @Size(max = 200) List<@NotNull Long> mediaIds) {
}
