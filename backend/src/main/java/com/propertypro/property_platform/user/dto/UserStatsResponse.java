package com.propertypro.property_platform.user.dto;

import java.util.Map;

/**
 * Non-deleted users in total and per status.
 *
 * @param byStatus every status value as a key, 0 when no user has it
 */
public record UserStatsResponse(long total, Map<String, Long> byStatus) {
}
