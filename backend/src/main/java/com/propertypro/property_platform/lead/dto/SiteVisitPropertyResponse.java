package com.propertypro.property_platform.lead.dto;

/** The visited property; {@code projectName} and the rest are null if the property no longer exists. */
public record SiteVisitPropertyResponse(Long id, String projectName, String slug, String city, String locality) {
}
