package com.propertypro.property_platform.lead.service;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.ZoneId;

/**
 * Site visit scheduling rules ({@code app.site-visit.*}).
 *
 * @param timeZone       zone of the visit date and time; decides what "today" and "past" mean
 * @param maxAdvanceDays how many days ahead a visit may be booked or moved
 */
@Validated
@ConfigurationProperties("app.site-visit")
public record SiteVisitProperties(@NotNull ZoneId timeZone, @Positive int maxAdvanceDays) {
}
