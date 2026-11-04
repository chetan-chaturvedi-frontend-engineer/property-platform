package com.propertypro.property_platform.activitylog.service;

import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import lombok.With;

import java.util.Map;

/**
 * What a module wants logged; request details are added by {@link SystemLogService}. For example:
 * <pre>{@code
 * SystemLogEntry.success("faqs", "FAQ updated").withReference("Faq", faq.getId()).withAdditionalData(Map.of("slug", slug))
 * }</pre>
 * Never put passwords, tokens, OTPs or document numbers in the action or additional data.
 *
 * @param userId who acted; only needed when no user is authenticated yet (login), otherwise taken from the request
 */
public record SystemLogEntry(String module, String action, SystemLogLevel level, @With Long userId,
		String referenceType, Long referenceId, @With Map<String, Object> additionalData) {

	public static SystemLogEntry info(String module, String action) {
		return of(module, action, SystemLogLevel.INFO);
	}

	public static SystemLogEntry success(String module, String action) {
		return of(module, action, SystemLogLevel.SUCCESS);
	}

	public static SystemLogEntry warning(String module, String action) {
		return of(module, action, SystemLogLevel.WARNING);
	}

	public SystemLogEntry withReference(String type, Long id) {
		return new SystemLogEntry(module, action, level, userId, type, id, additionalData);
	}

	private static SystemLogEntry of(String module, String action, SystemLogLevel level) {
		return new SystemLogEntry(module, action, level, null, null, null, null);
	}

}
