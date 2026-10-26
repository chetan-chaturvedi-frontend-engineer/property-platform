package com.propertypro.property_platform.lead.dto;

/**
 * A user referenced by a lead (creator, assignee, actor). Deliberately only the name: never contact
 * details, which leads would otherwise expose to app users. {@code fullName} is null for deleted users.
 */
public record LeadUserResponse(Long id, String fullName) {
}
