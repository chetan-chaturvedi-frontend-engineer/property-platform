package com.propertypro.property_platform.auth.api;

import com.propertypro.property_platform.auth.dto.AdminLoginRequest;
import com.propertypro.property_platform.auth.dto.AdminTokenResponse;
import com.propertypro.property_platform.auth.dto.AdminUserResponse;
import com.propertypro.property_platform.auth.dto.MessageResponse;
import com.propertypro.property_platform.auth.dto.RefreshTokenRequest;
import com.propertypro.property_platform.auth.service.AdminAuthService;
import com.propertypro.property_platform.auth.service.TokenService;
import com.propertypro.property_platform.common.web.ClientIp;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.ActiveSessionValidator;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Admin-panel authentication. Login and refresh are public; {@code /me} needs {@code ADMIN_PANEL_ACCESS}
 * like every {@code /api/v1/admin/**} endpoint (see {@code SecurityConfig}); logout only needs a valid
 * token, so a user whose access was just revoked can still end the session.
 */
@RestController
@RequestMapping(path = "/api/v1/admin", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Admin authentication", description = "Login for users whose role grants admin-panel access")
@RequiredArgsConstructor
public class AdminAuthController {

	private final AdminAuthService adminAuthService;
	private final TokenService tokenService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Log in to the admin panel", description = """
			401 invalid_credentials for any unknown account or wrong password. With the correct password: \
			403 account_inactive / verification_required, or 403 admin_access_denied when the role \
			(users.user_type = roles.slug) does not grant admin_panel.access.""")
	@PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
	public AdminTokenResponse login(@Valid @RequestBody AdminLoginRequest request, HttpServletRequest http) {
		return adminAuthService.login(request, ClientIp.of(http));
	}

	@Operation(summary = "Rotate the refresh token", description = "Admin access is checked again.")
	@PostMapping(path = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE)
	public AdminTokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request, HttpServletRequest http) {
		rateLimiter.acquire("refresh:ip:" + ClientIp.of(http), limits.refreshIp());
		return adminAuthService.refresh(request.refreshToken());
	}

	@Operation(summary = "The signed-in user, role and current permissions")
	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@GetMapping("/me")
	public AdminUserResponse me(@AuthenticationPrincipal Jwt jwt) {
		return adminAuthService.me(Long.valueOf(jwt.getSubject()));
	}

	@Operation(summary = "Log out", description = "Revokes this session: its access and refresh tokens stop working.")
	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@PostMapping("/logout")
	public MessageResponse logout(@AuthenticationPrincipal Jwt jwt) {
		tokenService.logout(UUID.fromString(jwt.getClaimAsString(ActiveSessionValidator.SESSION_CLAIM)),
				"admin_logout");
		return new MessageResponse("Logged out.");
	}

}
