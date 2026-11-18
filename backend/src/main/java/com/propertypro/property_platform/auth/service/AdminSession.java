package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.auth.dto.AdminUserResponse;

/** A started or refreshed admin session: the tokens to put in cookies and the signed-in user. */
public record AdminSession(IssuedTokens tokens, AdminUserResponse user) {
}
