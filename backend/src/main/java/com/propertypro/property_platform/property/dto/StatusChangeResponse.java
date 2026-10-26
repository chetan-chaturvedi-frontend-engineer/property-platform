package com.propertypro.property_platform.property.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.propertypro.property_platform.property.domain.StatusChangeAction;

import java.time.Instant;

/** One entry of a property's status history; {@code actorUserId} only in admin responses. */
public record StatusChangeResponse(StatusChangeAction action, String fromStatus, String toStatus, String reason,
		Instant createdAt, @JsonInclude(JsonInclude.Include.NON_NULL) Long actorUserId) {
}
