package com.propertypro.property_platform.property.dto;

import java.util.Map;

/**
 * Property counts for the admin dashboard. {@code total} and both maps cover non-deleted properties, so
 * each map adds up to {@code total}; {@code deleted} counts soft-deleted ones separately.
 *
 * @param byPublicationStatus  every publication status as a key, 0 when no property has it
 * @param byLegalApprovalStatus every legal approval status as a key, 0 when no property has it
 */
public record PropertyStatsResponse(long total, Map<String, Long> byPublicationStatus,
		Map<String, Long> byLegalApprovalStatus, long deleted) {
}
