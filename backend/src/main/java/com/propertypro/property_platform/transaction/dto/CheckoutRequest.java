package com.propertypro.property_platform.transaction.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Starts a payment for this plan; the amount always comes from the plan, never from the client. */
@RejectUnknownFields
public record CheckoutRequest(@NotNull @Positive Long planId) {
}
