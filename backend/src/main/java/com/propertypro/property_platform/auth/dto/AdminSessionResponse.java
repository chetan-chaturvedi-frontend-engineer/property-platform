package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.auth.service.AdminSession;

import java.time.Instant;

/**
 * Admin login and refresh result. The tokens themselves are only in HttpOnly cookies, never in the body.
 *
 * @param expiresIn access-token lifetime in seconds
 */
public record AdminSessionResponse(long expiresIn, Instant refreshTokenExpiresAt, AdminUserResponse user) {

	public static AdminSessionResponse of(AdminSession session) {
		return new AdminSessionResponse(session.tokens().accessTokenTtl().toSeconds(),
				session.tokens().refreshTokenExpiresAt(), session.user());
	}

}
