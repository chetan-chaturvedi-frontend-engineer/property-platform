package com.propertypro.property_platform.auth.api;

import com.propertypro.property_platform.auth.dto.ForgotPasswordRequest;
import com.propertypro.property_platform.auth.dto.LoginRequest;
import com.propertypro.property_platform.auth.dto.MessageResponse;
import com.propertypro.property_platform.auth.dto.RefreshTokenRequest;
import com.propertypro.property_platform.auth.dto.RegisterRequest;
import com.propertypro.property_platform.auth.dto.ResendOtpRequest;
import com.propertypro.property_platform.auth.dto.ResetPasswordRequest;
import com.propertypro.property_platform.auth.dto.TokenResponse;
import com.propertypro.property_platform.auth.dto.VerificationStatusResponse;
import com.propertypro.property_platform.auth.dto.VerifyOtpRequest;
import com.propertypro.property_platform.auth.exception.AuthExceptions;
import com.propertypro.property_platform.auth.service.IssuedTokens;
import com.propertypro.property_platform.auth.service.LoginService;
import com.propertypro.property_platform.auth.service.OtpRequestService;
import com.propertypro.property_platform.auth.service.PasswordResetService;
import com.propertypro.property_platform.auth.service.RegistrationService;
import com.propertypro.property_platform.auth.service.TokenService;
import com.propertypro.property_platform.auth.service.VerificationService;
import com.propertypro.property_platform.common.web.ClientIp;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.ActiveSessionValidator;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.dto.UserResponse;
import com.propertypro.property_platform.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Authentication for {@code user} accounts (mobile app). Admin authentication is separate. */
@RestController
@RequestMapping(path = "/api/v1/auth", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class AuthController {

	/** Same text whether or not an eligible account exists. */
	private static final String CODE_SENT = "If the account exists and is eligible, a code has been sent.";

	private final RegistrationService registrationService;
	private final VerificationService verificationService;
	private final OtpRequestService otpRequestService;
	private final LoginService loginService;
	private final PasswordResetService passwordResetService;
	private final TokenService tokenService;
	private final UserRepository userRepository;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public VerificationStatusResponse register(@Valid @RequestBody RegisterRequest request,
			HttpServletRequest http) {
		return VerificationStatusResponse.of("Verification required. Enter the code sent to your email or phone.",
				registrationService.register(request, ClientIp.of(http)));
	}

	@PostMapping(path = "/verify-otp", consumes = MediaType.APPLICATION_JSON_VALUE)
	public VerificationStatusResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request,
			HttpServletRequest http) {
		return VerificationStatusResponse.of("Verification successful.",
				verificationService.verify(request, ClientIp.of(http)));
	}

	@PostMapping(path = "/resend-otp", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	public MessageResponse resendOtp(@Valid @RequestBody ResendOtpRequest request, HttpServletRequest http) {
		otpRequestService.resend(request, ClientIp.of(http));
		return new MessageResponse(CODE_SENT);
	}

	@PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
	public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		LoginService.LoginResult result = loginService.login(request, ClientIp.of(http));
		return TokenResponse.of(result.tokens(), UserResponse.from(result.user()));
	}

	@PostMapping(path = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE)
	public TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request, HttpServletRequest http) {
		rateLimiter.acquire("refresh:ip:" + ClientIp.of(http), limits.refreshIp());
		IssuedTokens tokens = tokenService.refresh(request.refreshToken());
		UserResponse user = userRepository.findById(tokens.userId()).map(UserResponse::from)
				.orElseThrow(AuthExceptions::invalidRefreshToken);
		return TokenResponse.of(tokens, user);
	}

	@PostMapping(path = "/forgot-password", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request,
			HttpServletRequest http) {
		otpRequestService.requestPasswordReset(request.identifier(), ClientIp.of(http));
		return new MessageResponse(CODE_SENT);
	}

	@PostMapping(path = "/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE)
	public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request,
			HttpServletRequest http) {
		passwordResetService.reset(request, ClientIp.of(http));
		return new MessageResponse("Password has been reset. Log in with your new password.");
	}

	/** Revokes this session: its access token and refresh token stop working immediately. */
	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@PostMapping("/logout")
	public MessageResponse logout(@AuthenticationPrincipal Jwt jwt) {
		tokenService.logout(UUID.fromString(jwt.getClaimAsString(ActiveSessionValidator.SESSION_CLAIM)),
				"logout");
		return new MessageResponse("Logged out.");
	}

	@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
	@GetMapping("/me")
	public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
		return userRepository.findById(Long.valueOf(jwt.getSubject())).map(UserResponse::from)
				.orElseThrow(AuthExceptions::invalidCredentials);
	}

}
