package com.propertypro.property_platform.user.dto;

import java.time.Instant;

/**
 * Who a user is, for audit views only; also covers soft-deleted users ({@code deleted}). Never add password,
 * token or document fields.
 */
public record UserAuditProfile(Long id, String fullName, String email, String phone, String status, String userType,
		boolean deleted, Instant createdAt) {
}
