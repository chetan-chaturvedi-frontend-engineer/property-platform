package com.propertypro.property_platform.cms.banner.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Whether a banner is shown right now and why not; derived from status and schedule, never stored. */
@Getter
@RequiredArgsConstructor
public enum BannerDisplayState implements PersistableEnum {

	/** Status is inactive, whatever the schedule. */
	INACTIVE("inactive"),
	/** Active, but the start date is still in the future. */
	SCHEDULED("scheduled"),
	/** Shown to app users. */
	LIVE("live"),
	/** Active, but the end date has passed. */
	EXPIRED("expired");

	private final String value;

}
