package com.propertypro.property_platform.security;

import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.role.service.RolePermissionService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
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
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;
import java.util.Set;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	private static final String[] PUBLIC_AUTH_ENDPOINTS = { "/api/v1/auth/register", "/api/v1/auth/verify-otp",
			"/api/v1/auth/resend-otp", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
			"/api/v1/auth/reset-password" };
	private static final String[] ADMIN_PUBLIC_ENDPOINTS = { AdminCookiePaths.LOGIN, AdminCookiePaths.REFRESH };
	private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
	public static final String CSRF_HEADER = "X-XSRF-TOKEN";

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, RolePermissionService rolePermissionService,
			SystemLogService systemLog, AuthCookieProperties cookies) throws Exception {
		http
			// The admin dashboard authenticates with HttpOnly cookies, which browsers attach automatically, so
			// its state-changing requests need a CSRF token (double submit: X-XSRF-TOKEN header matching the
			// XSRF-TOKEN cookie). Requests with an Authorization header (mobile app, API tools) cannot be
			// forged cross-site and are exempt.
			.csrf(csrf -> csrf
				.csrfTokenRepository(csrfTokenRepository(cookies))
				.requireCsrfProtectionMatcher(cookieAuthenticatedAdminWrite()))
			// Cookie credentials are accepted only after the CSRF check (see CsrfCheckedMarkerFilter).
			.addFilterAfter(new CsrfCheckedMarkerFilter(), CsrfFilter.class)
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
				.requestMatchers(HttpMethod.GET, AdminCookiePaths.CSRF).permitAll()
				// Any valid session may end itself, even after its admin access was revoked.
				.requestMatchers(HttpMethod.POST, "/api/v1/admin/logout").authenticated()
				// Every other admin endpoint, checked on each request with permissions loaded from the role.
				.requestMatchers("/api/v1/admin/**").hasAuthority(Permissions.ADMIN_PANEL_ACCESS)
				.anyRequest().authenticated())
			.oauth2ResourceServer(resourceServer -> resourceServer
				.bearerTokenResolver(bearerTokenResolver(cookies))
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter(rolePermissionService)))
				.authenticationEntryPoint(ProblemDetailSecurityHandlers.authenticationEntryPoint())
				.accessDeniedHandler(ProblemDetailSecurityHandlers.accessDeniedHandler(systemLog)))
			.exceptionHandling(exceptions -> exceptions
				.authenticationEntryPoint(ProblemDetailSecurityHandlers.authenticationEntryPoint())
				.accessDeniedHandler(ProblemDetailSecurityHandlers.accessDeniedHandler(systemLog)));
		return http.build();
	}

	@Bean
	BearerTokenResolver bearerTokenResolver(AuthCookieProperties cookies) {
		return new CookieBearerTokenResolver(cookies);
	}

	/** HttpOnly XSRF-TOKEN cookie; the dashboard reads the token from {@code GET /api/v1/admin/csrf}. */
	private static CookieCsrfTokenRepository csrfTokenRepository(AuthCookieProperties cookies) {
		CookieCsrfTokenRepository repository = new CookieCsrfTokenRepository();
		repository.setHeaderName(CSRF_HEADER);
		repository.setCookieCustomizer(cookie -> cookie.httpOnly(true)
			.secure(cookies.secure())
			.sameSite(cookies.sameSite()));
		return repository;
	}

	/** State-changing admin requests that would be authenticated by the browser's cookies. */
	private static RequestMatcher cookieAuthenticatedAdminWrite() {
		return request -> !SAFE_METHODS.contains(request.getMethod())
				&& request.getHeader(HttpHeaders.AUTHORIZATION) == null
				&& AdminCookiePaths.isAdminApi(CookieBearerTokenResolver.pathWithinApplication(request));
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
		config.setAllowedHeaders(List.of("Authorization", "Content-Type", "If-Match", "Idempotency-Key", CSRF_HEADER));
		config.setExposedHeaders(List.of("ETag", "Retry-After"));
		// The admin dashboard's session cookies; only the explicit origins above may send them.
		config.setAllowCredentials(true);
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
