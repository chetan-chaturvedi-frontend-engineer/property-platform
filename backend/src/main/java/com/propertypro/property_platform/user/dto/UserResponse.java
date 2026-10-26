package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;

import java.time.Instant;

/** Safe profile of the user themselves. Never add password, OTP, token or document fields. */
public record UserResponse(Long id, String fullName, String email, String phone, UserStatus status,
		String userType, boolean emailVerified, boolean phoneVerified, boolean notificationsEnabled,
		Instant createdAt) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getStatus(),
				user.getUserType(), user.isEmailVerified(), user.isPhoneVerified(), user.isNotificationsEnabled(),
				user.getCreatedAt());
	}

}
