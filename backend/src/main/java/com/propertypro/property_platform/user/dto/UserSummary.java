package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.user.domain.User;

/** Contact details of another user, for admin views only. Never add password, token or document fields. */
public record UserSummary(Long id, String fullName, String email, String phone) {

	public static UserSummary from(User user) {
		return new UserSummary(user.getId(), user.getFullName(), user.getEmail(), user.getPhone());
	}

}
