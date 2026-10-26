package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.auth.service.IssuedTokens;

import java.time.Instant;

/** Admin login and refresh result. {@code expiresIn} is the access-token lifetime in seconds. */
public record AdminTokenResponse(String tokenType, String accessToken, long expiresIn, String refreshToken,
		Instant refreshTokenExpiresAt, AdminUserResponse user) {

	public static AdminTokenResponse of(IssuedTokens tokens, AdminUserResponse user) {
		return new AdminTokenResponse("Bearer", tokens.accessToken(), tokens.accessTokenTtl().toSeconds(),
				tokens.refreshToken(), tokens.refreshTokenExpiresAt(), user);
	}

}
