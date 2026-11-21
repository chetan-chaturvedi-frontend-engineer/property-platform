package com.propertypro.property_platform.propertyview.dto;

/** View numbers of one or more properties: every view, and how many different users viewed. */
public record PropertyViewTotals(long views, long uniqueViewers) {
}
