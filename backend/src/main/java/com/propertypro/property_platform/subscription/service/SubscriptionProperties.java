package com.propertypro.property_platform.subscription.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Subscription rules ({@code app.subscription.*}).
 *
 * @param allowUnpaidActivation whether a user can take a paid plan without payment; only the dev profile turns
 *                              this on, since no payment gateway is integrated yet
 */
@Validated
@ConfigurationProperties("app.subscription")
public record SubscriptionProperties(boolean allowUnpaidActivation) {
}
