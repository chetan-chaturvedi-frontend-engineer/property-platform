package com.propertypro.property_platform.activitylog.event;

import com.propertypro.property_platform.activitylog.domain.SystemLog;

/** A log ready to be stored, with its request details already captured on the caller's thread. */
public record SystemLogRecordedEvent(SystemLog log) {
}
