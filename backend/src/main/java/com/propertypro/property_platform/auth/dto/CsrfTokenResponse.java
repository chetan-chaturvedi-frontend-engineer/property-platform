package com.propertypro.property_platform.auth.dto;

/** The CSRF token the admin dashboard sends back in {@code headerName} on state-changing requests. */
public record CsrfTokenResponse(String headerName, String token) {
}
