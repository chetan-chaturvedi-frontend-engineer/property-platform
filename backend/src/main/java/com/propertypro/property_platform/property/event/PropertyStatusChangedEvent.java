package com.propertypro.property_platform.property.event;

/**
 * Published inside the transaction that changes a property's publication status and delivered after commit, so the
 * owner can be told about a decision made by someone else.
 *
 * @param actorUserId who made the change; the owner's own changes are not worth a notification
 */
public record PropertyStatusChangedEvent(Long propertyId, Long ownerId, String projectName, String toStatus,
		String reason, Long actorUserId) {
}
