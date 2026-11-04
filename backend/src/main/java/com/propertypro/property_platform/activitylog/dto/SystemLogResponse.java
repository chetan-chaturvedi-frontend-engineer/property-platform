package com.propertypro.property_platform.activitylog.dto;

import com.propertypro.property_platform.activitylog.domain.SystemLog;
import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import com.propertypro.property_platform.user.dto.UserAuditProfile;

import java.time.Instant;
import java.util.Map;

/** @param user who acted; {@code null} for guest and system activity */
public record SystemLogResponse(Long id, UserAuditProfile user, String module, String action, SystemLogLevel logLevel,
		String ipAddress, String userAgent, String requestMethod, String requestUrl, Long referenceId,
		String referenceType, Map<String, Object> additionalData, Instant createdAt) {

	public static SystemLogResponse of(SystemLog log, UserAuditProfile user) {
		return new SystemLogResponse(log.getId(), user, log.getModule(), log.getAction(), log.getLogLevel(),
				log.getIpAddress(), log.getUserAgent(), log.getRequestMethod(), log.getRequestUrl(), log.getReferenceId(),
				log.getReferenceType(), log.getAdditionalData(), log.getCreatedAt());
	}

}
