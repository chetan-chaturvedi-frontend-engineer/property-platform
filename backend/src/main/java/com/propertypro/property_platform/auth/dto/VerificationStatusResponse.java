package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;

public record VerificationStatusResponse(String message, UserStatus status, boolean emailVerified,
		boolean phoneVerified) {

	public static VerificationStatusResponse of(String message, User user) {
		return new VerificationStatusResponse(message, user.getStatus(), user.isEmailVerified(),
				user.isPhoneVerified());
	}

}
