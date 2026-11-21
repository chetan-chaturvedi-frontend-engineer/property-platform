package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Takes the plan with this id; price, limits and dates come from the plan and the server clock. */
@RejectUnknownFields
public record SubscribeRequest(@NotNull @Positive Long planId) {
}
