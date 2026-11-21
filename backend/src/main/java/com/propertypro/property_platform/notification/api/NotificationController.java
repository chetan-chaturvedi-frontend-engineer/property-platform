package com.propertypro.property_platform.notification.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.notification.dto.NotificationResponse;
import com.propertypro.property_platform.notification.dto.UnreadCountResponse;
import com.propertypro.property_platform.notification.service.NotificationService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The caller's in-app notifications (mobile app). The owner always comes from the token. */
@RestController
@RequestMapping(path = "/api/v1/notifications", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Notifications", description = "The caller's in-app notifications")
@Validated
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationService notificationService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "My notifications (NOTIFICATION_LIST)", description = """
			Newest first. unread=true keeps the unread ones only. page (zero-based) and size (max 100).""")
	@GetMapping
	public PageResponse<NotificationResponse> list(CurrentActor actor,
			@RequestParam(name = "unread", defaultValue = "false") boolean unread,
			@SortDefault(sort = "createdAt") Pageable pageable) {
		return notificationService.list(actor, unread, pageable);
	}

	@Operation(summary = "Unread count (NOTIFICATION_LIST)", description = "For the badge.")
	@GetMapping("/unread-count")
	public UnreadCountResponse unreadCount(CurrentActor actor) {
		return notificationService.unreadCount(actor);
	}

	@Operation(summary = "Mark one read (NOTIFICATION_UPDATE)", description = "Idempotent. 404 for anyone else's.")
	@PatchMapping("/{id}/read")
	public NotificationResponse markRead(CurrentActor actor, @PathVariable @Positive Long id) {
		rateLimiter.acquire("notification:write:user:" + actor.userId(), limits.notificationWriteUser());
		return notificationService.markRead(actor, id);
	}

	@Operation(summary = "Mark all read (NOTIFICATION_UPDATE)", description = "Idempotent.")
	@PostMapping("/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markAllRead(CurrentActor actor) {
		rateLimiter.acquire("notification:write:user:" + actor.userId(), limits.notificationWriteUser());
		notificationService.markAllRead(actor);
	}

	@Operation(summary = "Delete one (NOTIFICATION_DELETE)", description = "404 for anyone else's.")
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(CurrentActor actor, @PathVariable @Positive Long id) {
		rateLimiter.acquire("notification:write:user:" + actor.userId(), limits.notificationWriteUser());
		notificationService.delete(actor, id);
	}

}
