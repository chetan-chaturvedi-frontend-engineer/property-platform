package com.propertypro.property_platform.transaction.dto;

import com.propertypro.property_platform.subscription.dto.UserSubscriptionResponse;

/** {@code subscription} is null only when the user already had another subscription in force. */
public record PaymentResultResponse(String status, UserSubscriptionResponse subscription) {
}
