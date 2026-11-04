package com.propertypro.property_platform.activitylog.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Severity of a system log. Keep in sync with {@code chk_system_logs_log_level}. */
@Getter
@RequiredArgsConstructor
public enum SystemLogLevel implements PersistableEnum {

	/** General activity, including sensitive reads. */
	INFO("info"),
	/** A completed operation. */
	SUCCESS("success"),
	/** Failed attempts, suspicious activity and risky operations. */
	WARNING("warning");

	/** Accepted request values, for {@code @Pattern}. */
	public static final String VALUES = "info|success|warning";

	private final String value;

	public static SystemLogLevel fromValue(String value) {
		return PersistableEnum.fromValue(SystemLogLevel.class, value);
	}

}
