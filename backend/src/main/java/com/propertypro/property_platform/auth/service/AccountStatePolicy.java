package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;

/**
 * Account states that may log in: active with a verified email or phone. Shared by the app and admin
 * logins; only applied after the correct password, so the state is never revealed to others.
 */
final class AccountStatePolicy {

	private AccountStatePolicy() {
	}

	/** The error to return, or null if the account may log in. */
	static ApiException check(User user) {
		if (user.getStatus() == UserStatus.PENDING) {
			return AuthExceptions.verificationRequired();
		}
		if (user.getStatus() != UserStatus.ACTIVE) {
			return AuthExceptions.accountInactive();
		}
		if (!user.isEmailVerified() && !user.isPhoneVerified()) {
			return AuthExceptions.verificationRequired();
		}
		return null;
	}

}
