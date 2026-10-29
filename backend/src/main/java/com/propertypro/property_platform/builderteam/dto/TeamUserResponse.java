package com.propertypro.property_platform.builderteam.dto;

/**
 * A user on a membership. {@code email} and {@code phone} are null where the caller may not see them;
 * {@code fullName} is null for deleted accounts. Never add password, token or document fields.
 */
public record TeamUserResponse(Long id, String fullName, String email, String phone) {
}
