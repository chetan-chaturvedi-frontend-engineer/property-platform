package com.propertypro.property_platform.user.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.dto.ChangePasswordRequest;
import com.propertypro.property_platform.user.dto.DeleteAccountRequest;
import com.propertypro.property_platform.user.dto.UpdateProfileRequest;
import com.propertypro.property_platform.user.dto.UserResponse;
import com.propertypro.property_platform.user.service.UserProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The caller's own account (mobile app). There is no id in the path: the owner always comes from the token. */
@RestController
@RequestMapping(path = "/api/v1/users/me", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "My account", description = "Rename, change password, delete the caller's account")
@RequiredArgsConstructor
public class UserProfileController {

	private final UserProfileService userProfileService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Change my name (PROFILE_UPDATE)", description = "Only the full name; 2 to 150 characters.")
	@PatchMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public UserResponse rename(CurrentActor actor, @Valid @RequestBody UpdateProfileRequest request) {
		rateLimiter.acquire("profile:write:user:" + actor.userId(), limits.profileWriteUser());
		return userProfileService.rename(actor, request);
	}

	@Operation(summary = "Change my password (PROFILE_CHANGE_PASSWORD)", description = """
			Needs the current password (422 password_incorrect) and a different strong new one (422 \
			password_unchanged). Ends every session, including this one: sign in again.""")
	@PostMapping(path = "/change-password", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void changePassword(CurrentActor actor, @Valid @RequestBody ChangePasswordRequest request) {
		rateLimiter.acquire("profile:write:user:" + actor.userId(), limits.profileWriteUser());
		userProfileService.changePassword(actor, request);
	}

	@Operation(summary = "Delete my account (PROFILE_DELETE)", description = """
			Needs the password (422 password_incorrect). Soft delete: ends every session and archives the \
			account's properties; the email and phone stay reserved.""")
	@DeleteMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(CurrentActor actor, @Valid @RequestBody DeleteAccountRequest request) {
		rateLimiter.acquire("profile:write:user:" + actor.userId(), limits.profileWriteUser());
		userProfileService.deleteAccount(actor, request);
	}

}
