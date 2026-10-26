package com.propertypro.property_platform.security;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * The authenticated user making the request: the id from the validated token's subject and the
 * permission codes loaded from their role. Never built from request data. Inject it as a
 * controller method parameter (see {@link CurrentActorArgumentResolver}).
 */
public record CurrentActor(Long userId, Set<String> permissions) {

	public CurrentActor {
		permissions = Set.copyOf(permissions);
	}

	public static CurrentActor from(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
			throw new AuthenticationCredentialsNotFoundException("Authentication required");
		}
		Set<String> permissions = authentication.getAuthorities().stream()
			.map(GrantedAuthority::getAuthority)
			.collect(Collectors.toSet());
		return new CurrentActor(Long.valueOf(jwt.getSubject()), permissions);
	}

	public boolean has(String permission) {
		return permissions.contains(permission);
	}

}
