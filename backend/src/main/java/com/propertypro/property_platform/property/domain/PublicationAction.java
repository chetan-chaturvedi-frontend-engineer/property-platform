package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;

import java.util.EnumSet;
import java.util.Set;

import static com.propertypro.property_platform.property.domain.PublicationStatus.APPROVED;
import static com.propertypro.property_platform.property.domain.PublicationStatus.ARCHIVED;
import static com.propertypro.property_platform.property.domain.PublicationStatus.DRAFT;
import static com.propertypro.property_platform.property.domain.PublicationStatus.PENDING_REVIEW;
import static com.propertypro.property_platform.property.domain.PublicationStatus.PUBLISHED;
import static com.propertypro.property_platform.property.domain.PublicationStatus.REJECTED;
import static com.propertypro.property_platform.property.domain.PublicationStatus.SUSPENDED;

/**
 * The only allowed publication status transitions. Who may perform each one is decided by
 * {@code PropertyPublicationService}; this enum only knows the workflow.
 */
@Getter
public enum PublicationAction implements PersistableEnum {

	SUBMIT("submit", EnumSet.of(DRAFT, REJECTED), PENDING_REVIEW, false),
	APPROVE("approve", EnumSet.of(PENDING_REVIEW), APPROVED, false),
	REJECT("reject", EnumSet.of(PENDING_REVIEW), REJECTED, true),
	PUBLISH("publish", EnumSet.of(APPROVED), PUBLISHED, false),
	UNPUBLISH("unpublish", EnumSet.of(PUBLISHED), APPROVED, false),
	SUSPEND("suspend", EnumSet.of(APPROVED, PUBLISHED), SUSPENDED, true),
	RESUME("resume", EnumSet.of(SUSPENDED), APPROVED, false),
	ARCHIVE("archive", EnumSet.complementOf(EnumSet.of(ARCHIVED)), ARCHIVED, false);

	/** Allowed request values, for validating the {@code action} field. */
	public static final String VALUES = "submit|approve|reject|publish|unpublish|suspend|resume|archive";

	private final String value;
	private final Set<PublicationStatus> from;
	private final PublicationStatus to;
	private final boolean reasonRequired;

	PublicationAction(String value, Set<PublicationStatus> from, PublicationStatus to, boolean reasonRequired) {
		this.value = value;
		this.from = from;
		this.to = to;
		this.reasonRequired = reasonRequired;
	}

	public boolean isAllowedFrom(PublicationStatus status) {
		return from.contains(status);
	}

	public static PublicationAction fromValue(String value) {
		return PersistableEnum.fromValue(PublicationAction.class, value);
	}

}
