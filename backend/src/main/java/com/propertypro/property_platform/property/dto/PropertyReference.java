package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.property.domain.PublicationStatus;

/**
 * A property as other modules see it: identity, owner and display name, never listing details.
 *
 * @param ownerId {@code property_projects.user_id}, the builder or owner
 * @param deleted soft-deleted; kept so history (e.g. old site visits) can still name the property
 */
public record PropertyReference(Long id, Long ownerId, String projectName, String slug, String city,
		String locality, PublicationStatus publicationStatus, boolean deleted) {

	public boolean isPublished() {
		return !deleted && publicationStatus == PublicationStatus.PUBLISHED;
	}

}
