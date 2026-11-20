package com.propertypro.property_platform.lead.dto;

import java.util.Map;

/**
 * Lead counts for the admin dashboard; soft-deleted leads are excluded. Each map adds up to {@code total}.
 *
 * @param byStatus every lead status as a key, 0 when no lead has it
 * @param bySource every lead source as a key, 0 when no lead has it
 */
public record LeadStatsResponse(long total, Map<String, Long> byStatus, Map<String, Long> bySource) {
}
