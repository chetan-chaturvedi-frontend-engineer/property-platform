package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.StatusChangeAction;

import java.time.Instant;

/**
 * One lifecycle event of any property, for the admin activity feed.
 *
 * @param fromStatus  publication status before, or the legal approval status for {@code legal_status_changed}
 * @param projectName current name of the property; null if the property no longer exists
 * @param actorName   who made the change; null when the account is gone
 */
public record PropertyActivityResponse(Long id, Long propertyId, String projectName, StatusChangeAction action,
		String fromStatus, String toStatus, String reason, String actorName, Instant createdAt) {
}
