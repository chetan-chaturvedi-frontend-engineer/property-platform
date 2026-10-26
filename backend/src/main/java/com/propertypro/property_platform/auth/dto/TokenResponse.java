package com.propertypro.property_platform.auth.dto;

import com.propertypro.property_platform.auth.service.IssuedTokens;
import com.propertypro.property_platform.user.dto.UserResponse;

import java.time.Instant;

/** Login and refresh result. {@code expiresIn} is the access-token lifetime in seconds. */
public record TokenResponse(String tokenType, String accessToken, long expiresIn, String refreshToken,
		Instant refreshTokenExpiresAt, UserResponse user) {

	public static TokenResponse of(IssuedTokens tokens, UserResponse user) {
		return new TokenResponse("Bearer", tokens.accessToken(), tokens.accessTokenTtl().toSeconds(),
				tokens.refreshToken(), tokens.refreshTokenExpiresAt(), user);
	}

}
