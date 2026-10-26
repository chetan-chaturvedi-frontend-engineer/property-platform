package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.role.service.ResolvedRole;
import com.propertypro.property_platform.user.domain.User;

import java.util.List;

/**
 * The signed-in admin-panel user: safe profile fields, their role and the permission codes it grants
 * right now. Never add password, token, OTP or document fields.
 */
public record AdminUserResponse(Long id, String fullName, String email, String phone, Role role,
		List<String> permissions) {

	public static AdminUserResponse of(User user, ResolvedRole role) {
		return new AdminUserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
				new Role(role.slug(), role.name()), role.permissions().stream().sorted().toList());
	}

	public record Role(String slug, String name) {
	}

}
