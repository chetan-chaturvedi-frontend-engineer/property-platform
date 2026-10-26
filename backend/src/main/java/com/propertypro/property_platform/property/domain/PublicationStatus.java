package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Listing workflow, independent of construction ({@link ProjectStatus}) and legal approval
 * ({@link LegalApprovalStatus}). Only {@code published} projects are public. Transitions are the
 * {@link PublicationAction}s. Keep in sync with {@code chk_property_projects_publication_status}.
 */
@Getter
@RequiredArgsConstructor
public enum PublicationStatus implements PersistableEnum {

	DRAFT("draft"),
	PENDING_REVIEW("pending_review"),
	/** Approved by a reviewer, not (or no longer) public. */
	APPROVED("approved"),
	PUBLISHED("published"),
	REJECTED("rejected"),
	SUSPENDED("suspended"),
	/** Retired for good: read-only, never public again. */
	ARCHIVED("archived");

	/** Allowed request values, for {@code @Pattern} validation. */
	public static final String VALUES = "draft|pending_review|approved|published|rejected|suspended|archived";

	private final String value;

	public static PublicationStatus fromValue(String value) {
		return PersistableEnum.fromValue(PublicationStatus.class, value);
	}

}
