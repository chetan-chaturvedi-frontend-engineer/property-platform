package com.propertypro.property_platform.user.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.dto.UserSettingsRequest;
import com.propertypro.property_platform.user.dto.UserSettingsResponse;
import com.propertypro.property_platform.user.service.UserSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The caller's own settings (mobile app and admin dashboard). There is no id in the path and no way to
 * address another user's settings: the owner always comes from the token.
 */
@RestController
@RequestMapping(path = "/api/v1/user-settings", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "User settings", description = "The caller's preferences")
@RequiredArgsConstructor
public class UserSettingsController {

	private final UserSettingsService userSettingsService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "My settings (USER_SETTING_VIEW)", description = "404 until the settings are created.")
	@GetMapping
	public UserSettingsResponse get(CurrentActor actor) {
		return userSettingsService.get(actor);
	}

	@Operation(summary = "Create my settings (USER_SETTING_CREATE)", description = """
			Omitted fields take the defaults (theme system, language en, timezone UTC, notifications on except SMS). \
			409 when the settings already exist.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public UserSettingsResponse create(CurrentActor actor, @Valid @RequestBody UserSettingsRequest request) {
		rateLimiter.acquire("user-settings:write:user:" + actor.userId(), limits.userSettingWriteUser());
		return userSettingsService.create(actor, request);
	}

	@Operation(summary = "Update my settings (USER_SETTING_UPDATE)", description = """
			Partial update: omitted fields keep their value, null location clears it; at least one field. \
			404 until the settings are created.""")
	@PatchMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public UserSettingsResponse update(CurrentActor actor, @Valid @RequestBody UserSettingsRequest request) {
		rateLimiter.acquire("user-settings:write:user:" + actor.userId(), limits.userSettingWriteUser());
		return userSettingsService.update(actor, request);
	}

}
