package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Lifecycle of a planned activity; rescheduled rows are kept as history. Keep in sync with {@code chk_lead_schedules_status}. */
@Getter
@RequiredArgsConstructor
public enum ScheduleStatus implements PersistableEnum {

	PENDING("pending"),
	COMPLETED("completed"),
	CANCELLED("cancelled"),
	RESCHEDULED("rescheduled");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "pending|completed|cancelled|rescheduled";

	private final String value;

	public static ScheduleStatus fromValue(String value) {
		return PersistableEnum.fromValue(ScheduleStatus.class, value);
	}

}
