package com.propertypro.property_platform.lead.dto;

import java.util.Map;

/**
 * Site visit counts for the admin dashboard; soft-deleted visits are excluded. Each map adds up to {@code total}.
 *
 * @param byStatus    every visit status as a key, 0 when no visit has it
 * @param byVisitType every visit type as a key, 0 when no visit has it
 */
public record SiteVisitStatsResponse(long total, Map<String, Long> byStatus, Map<String, Long> byVisitType) {
}
