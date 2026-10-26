package com.propertypro.property_platform.security;

import com.propertypro.property_platform.role.service.RolePermissionService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	private static final String[] PUBLIC_AUTH_ENDPOINTS = { "/api/v1/auth/register", "/api/v1/auth/verify-otp",
			"/api/v1/auth/resend-otp", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
			"/api/v1/auth/reset-password" };
	private static final String[] ADMIN_PUBLIC_ENDPOINTS = { "/api/v1/admin/login", "/api/v1/admin/refresh" };

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, RolePermissionService rolePermissionService)
			throws Exception {
		http
			// Bearer tokens in the Authorization header, no cookies: CSRF does not apply.
			.csrf(AbstractHttpConfigurer::disable)
			.cors(Customizer.withDefaults())
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.POST, PUBLIC_AUTH_ENDPOINTS).permitAll()
				.requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
				.requestMatchers("/actuator/health/**", "/actuator/info", "/error").permitAll()
				// Only served when springdoc is enabled (dev profile).
				.requestMatchers(HttpMethod.GET, "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
				.requestMatchers(HttpMethod.POST, ADMIN_PUBLIC_ENDPOINTS).permitAll()
				// Any valid session may end itself, even after its admin access was revoked.
				.requestMatchers(HttpMethod.POST, "/api/v1/admin/logout").authenticated()
				// Every other admin endpoint, checked on each request with permissions loaded from the role.
				.requestMatchers("/api/v1/admin/**").hasAuthority(Permissions.ADMIN_PANEL_ACCESS)
				.anyRequest().authenticated())
			.oauth2ResourceServer(resourceServer -> resourceServer
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter(rolePermissionService)))
				.authenticationEntryPoint(ProblemDetailSecurityHandlers.authenticationEntryPoint())
				.accessDeniedHandler(ProblemDetailSecurityHandlers.accessDeniedHandler()))
			.exceptionHandling(exceptions -> exceptions
				.authenticationEntryPoint(ProblemDetailSecurityHandlers.authenticationEntryPoint())
				.accessDeniedHandler(ProblemDetailSecurityHandlers.accessDeniedHandler()));
		return http.build();
	}

	/**
	 * Tokens carry no permissions; they are loaded per request from the user's role, so role
	 * changes apply immediately. The subject was already validated by {@link ActiveSessionValidator}.
	 */
	private static JwtAuthenticationConverter jwtAuthenticationConverter(RolePermissionService rolePermissionService) {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(jwt -> rolePermissionService
			.permissionsOfUser(Long.valueOf(jwt.getSubject()))
			.stream()
			.<GrantedAuthority>map(SimpleGrantedAuthority::new)
			.toList());
		return converter;
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(properties.allowedOrigins());
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type", "If-Match", "Idempotency-Key"));
		config.setExposedHeaders(List.of("ETag"));
		config.setAllowCredentials(false);
		config.setMaxAge(Duration.ofHours(1));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", config);
		return source;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
