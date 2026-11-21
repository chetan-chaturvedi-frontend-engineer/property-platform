package com.propertypro.property_platform.property.dto;

/**
 * How buyers engaged with a property, or with all of an owner's properties: every view, how many different users
 * viewed, and how many saved it. Counts only; never who.
 */
public record PropertyEngagementResponse(long views, long uniqueViewers, long saves) {
}
