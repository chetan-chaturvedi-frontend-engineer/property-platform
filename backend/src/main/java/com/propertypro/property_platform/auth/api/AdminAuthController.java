package com.propertypro.property_platform.auth.api;

import com.propertypro.property_platform.auth.dto.AdminLoginRequest;
import com.propertypro.property_platform.auth.dto.AdminSessionResponse;
import com.propertypro.property_platform.auth.dto.AdminUserResponse;
import com.propertypro.property_platform.auth.dto.CsrfTokenResponse;
import com.propertypro.property_platform.auth.dto.MessageResponse;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.auth.service.AdminAuthService;
import com.propertypro.property_platform.auth.service.AdminSession;
import com.propertypro.property_platform.auth.service.TokenService;
import com.propertypro.property_platform.auth.web.AdminSessionCookies;
import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.common.web.ClientIp;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.ActiveSessionValidator;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin-panel authentication with an HttpOnly cookie session. Login and refresh set the cookies and never
 * return the tokens in the body; logout revokes the session and deletes them. Login, refresh and logout
 * need the CSRF token from {@code GET /csrf} in the {@code X-XSRF-TOKEN} header. {@code /me} needs
 * {@code ADMIN_PANEL_ACCESS} like every {@code /api/v1/admin/**} endpoint (see {@code SecurityConfig});
 * logout only needs a valid session, so a user whose access was just revoked can still end it.
 */
@RestController
@RequestMapping(path = "/api/v1/admin", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Admin authentication", description = "Cookie-session login for users whose role grants admin-panel access")
@RequiredArgsConstructor
public class AdminAuthController {

	private final AdminAuthService adminAuthService;
	private final TokenService tokenService;
	private final AdminSessionCookies cookies;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Get a CSRF token", description = """
			Sets the HttpOnly XSRF-TOKEN cookie and returns the matching token, which the dashboard sends in \
			the X-XSRF-TOKEN header of every state-changing admin request made with cookies.""")
	@GetMapping("/csrf")
	public CsrfTokenResponse csrf(CsrfToken token) {
		return new CsrfTokenResponse(token.getHeaderName(), token.getToken());
	}

	@Operation(summary = "Log in to the admin panel", description = """
			Sets the session cookies. 401 invalid_credentials for any unknown account or wrong password. With \
			the correct password: 403 account_inactive / verification_required, or 403 admin_access_denied when \
			the role (users.user_type = roles.slug) does not grant admin_panel.access.""")
	@PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
	public AdminSessionResponse login(@Valid @RequestBody AdminLoginRequest request, HttpServletRequest http,
			HttpServletResponse response) {
		AdminSession session = adminAuthService.login(request, ClientIp.of(http));
		cookies.write(response, session.tokens());
		return AdminSessionResponse.of(session);
	}

	@Operation(summary = "Rotate the refresh token", description = """
			Reads the refresh token cookie and sets new cookies; admin access is checked again. On failure the \
			cookies are deleted.""")
	@PostMapping("/refresh")
	public AdminSessionResponse refresh(HttpServletRequest http, HttpServletResponse response) {
		rateLimiter.acquire("refresh:ip:" + ClientIp.of(http), limits.refreshIp());
		try {
			String refreshToken = cookies.refreshToken(http).orElseThrow(AuthExceptions::invalidRefreshToken);
			AdminSession session = adminAuthService.refresh(refreshToken);
			cookies.write(response, session.tokens());
			return AdminSessionResponse.of(session);
		}
		catch (ApiException ex) {
			// The session is over (invalid, reused or revoked token, or no admin access): drop dead cookies.
			cookies.clear(response);
			throw ex;
		}
	}

	@Operation(summary = "The signed-in user, role and current permissions")
	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@GetMapping("/me")
	public AdminUserResponse me(@AuthenticationPrincipal Jwt jwt) {
		return adminAuthService.me(Long.valueOf(jwt.getSubject()));
	}

	@Operation(summary = "Log out", description = "Revokes this session and deletes the session cookies.")
	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@PostMapping("/logout")
	public MessageResponse logout(@AuthenticationPrincipal Jwt jwt, HttpServletResponse response) {
		tokenService.logout(UUID.fromString(jwt.getClaimAsString(ActiveSessionValidator.SESSION_CLAIM)),
				"admin_logout");
		cookies.clear(response);
		return new MessageResponse("Logged out.");
	}

}
