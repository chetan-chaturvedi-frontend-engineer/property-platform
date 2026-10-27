package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.EnumSet;
import java.util.Set;

/** Lifecycle of a site visit. Keep in sync with {@code chk_site_visits_status}. */
@Getter
@RequiredArgsConstructor
public enum SiteVisitStatus implements PersistableEnum {

	SCHEDULED("scheduled"),
	CONFIRMED("confirmed"),
	COMPLETED("completed"),
	CANCELLED("cancelled"),
	/** Set by the server when the date or time of an upcoming visit changes; never requested directly. */
	RESCHEDULED("rescheduled"),
	NO_SHOW("no_show");

	/** Accepted filter values, for {@code @Pattern}. */
	public static final String VALUES = "scheduled|confirmed|completed|cancelled|rescheduled|no_show";
	/** Values a status change may request, for {@code @Pattern}. */
	public static final String REQUESTABLE_VALUES = "confirmed|completed|cancelled|no_show";

	private static final Set<SiteVisitStatus> UPCOMING = EnumSet.of(SCHEDULED, CONFIRMED, RESCHEDULED);

	private final String value;

	public static SiteVisitStatus fromValue(String value) {
		return PersistableEnum.fromValue(SiteVisitStatus.class, value);
	}

	/** The visit has not happened yet, so its schedule and visitor details may still change. */
	public boolean isUpcoming() {
		return UPCOMING.contains(this);
	}

	/**
	 * The lifecycle rule, kept in this one place: an upcoming visit may be confirmed (once), completed,
	 * cancelled or marked no-show; completed, cancelled and no-show visits are final.
	 */
	public boolean canChangeTo(SiteVisitStatus next) {
		return isUpcoming() && next != this && next != SCHEDULED && next != RESCHEDULED;
	}

}
