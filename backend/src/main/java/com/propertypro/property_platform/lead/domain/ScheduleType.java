package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Kind of planned activity. Keep in sync with {@code chk_lead_schedules_schedule_type}. */
@Getter
@RequiredArgsConstructor
public enum ScheduleType implements PersistableEnum {

	CALL("call"),
	FOLLOW_UP("follow_up"),
	MEETING("meeting"),
	SITE_VISIT("site_visit"),
	VIDEO_CALL("video_call"),
	OTHER("other");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "call|follow_up|meeting|site_visit|video_call|other";

	private final String value;

	public static ScheduleType fromValue(String value) {
		return PersistableEnum.fromValue(ScheduleType.class, value);
	}

}
