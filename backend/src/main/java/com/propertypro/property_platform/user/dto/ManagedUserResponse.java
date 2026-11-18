package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.role.service.RoleInfo;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;

import java.time.Instant;

/**
 * An account as the admin user management sees it. Never add password, OTP, token, notification token or
 * document fields.
 *
 * @param userType the role slug stored in {@code users.user_type}
 * @param role     the non-deleted role with that slug; null when there is none (the user then has no permissions)
 */
public record ManagedUserResponse(Long id, String fullName, String email, String phone, UserStatus status,
		String userType, RoleRef role, boolean emailVerified, boolean phoneVerified, boolean notificationsEnabled,
		Instant createdAt, Instant updatedAt) {

	/** @param active an inactive role grants nothing */
	public record RoleRef(String slug, String name, boolean active) {
	}

	public static ManagedUserResponse from(User user, RoleInfo role) {
		return new ManagedUserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
				user.getStatus(), user.getUserType(),
				role == null ? null : new RoleRef(role.slug(), role.name(), role.active()),
				user.isEmailVerified(), user.isPhoneVerified(), user.isNotificationsEnabled(), user.getCreatedAt(),
				user.getUpdatedAt());
	}

}
