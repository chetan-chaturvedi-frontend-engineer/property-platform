package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Audited lifecycle event. Keep in sync with {@code chk_property_project_status_changes_action}. */
@Getter
@RequiredArgsConstructor
public enum StatusChangeAction implements PersistableEnum {

	CREATED("created"),
	SUBMITTED("submitted"),
	APPROVED("approved"),
	REJECTED("rejected"),
	PUBLISHED("published"),
	UNPUBLISHED("unpublished"),
	SUSPENDED("suspended"),
	RESUMED("resumed"),
	ARCHIVED("archived"),
	/** An owner edited an approved or published project, which takes it off the site until re-reviewed. */
	REVERTED_TO_DRAFT("reverted_to_draft"),
	DELETED("deleted"),
	RESTORED("restored"),
	LEGAL_STATUS_CHANGED("legal_status_changed");

	private final String value;

	public static StatusChangeAction of(PublicationAction action) {
		return switch (action) {
			case SUBMIT -> SUBMITTED;
			case APPROVE -> APPROVED;
			case REJECT -> REJECTED;
			case PUBLISH -> PUBLISHED;
			case UNPUBLISH -> UNPUBLISHED;
			case SUSPEND -> SUSPENDED;
			case RESUME -> RESUMED;
			case ARCHIVE -> ARCHIVED;
		};
	}

	public static StatusChangeAction fromValue(String value) {
		return PersistableEnum.fromValue(StatusChangeAction.class, value);
	}

}
