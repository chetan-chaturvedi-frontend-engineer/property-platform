package com.propertypro.property_platform.notification.service;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.notification.domain.Notification;
import com.propertypro.property_platform.notification.domain.NotificationType;
import com.propertypro.property_platform.notification.dto.NotificationResponse;
import com.propertypro.property_platform.notification.dto.UnreadCountResponse;
import com.propertypro.property_platform.notification.exception.NotificationExceptions;
import com.propertypro.property_platform.notification.repository.NotificationRepository;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.service.UserSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Map;

import static com.propertypro.property_platform.security.Permissions.NOTIFICATION_DELETE;
import static com.propertypro.property_platform.security.Permissions.NOTIFICATION_LIST;
import static com.propertypro.property_platform.security.Permissions.NOTIFICATION_UPDATE;

/**
 * The caller's in-app notifications, and the one way the server adds one. Every user-facing query is by the caller's
 * id from the token.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

	private final NotificationRepository repository;
	private final UserSettingsService userSettings;
	private final Clock clock;

	@Transactional(readOnly = true)
	public PageResponse<NotificationResponse> list(CurrentActor actor, boolean unreadOnly, Pageable pageable) {
		requirePermission(actor, NOTIFICATION_LIST);
		PageRequest page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
		Page<Notification> found = unreadOnly
				? repository.findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(actor.userId(), page)
				: repository.findByUserIdOrderByCreatedAtDescIdDesc(actor.userId(), page);
		return PageResponse.of(found, NotificationResponse::from);
	}

	@Transactional(readOnly = true)
	public UnreadCountResponse unreadCount(CurrentActor actor) {
		requirePermission(actor, NOTIFICATION_LIST);
		return new UnreadCountResponse(repository.countByUserIdAndReadAtIsNull(actor.userId()));
	}

	/** Idempotent: reading twice keeps the first read time. 404 for anyone else's notification. */
	@Transactional
	public NotificationResponse markRead(CurrentActor actor, Long id) {
		requirePermission(actor, NOTIFICATION_UPDATE);
		Notification notification = repository.findByIdAndUserId(id, actor.userId())
			.orElseThrow(NotificationExceptions::notFound);
		notification.markRead(clock.instant());
		return NotificationResponse.from(repository.save(notification));
	}

	@Transactional
	public int markAllRead(CurrentActor actor) {
		requirePermission(actor, NOTIFICATION_UPDATE);
		return repository.markAllRead(actor.userId(), clock.instant());
	}

	@Transactional
	public void delete(CurrentActor actor, Long id) {
		requirePermission(actor, NOTIFICATION_DELETE);
		if (repository.deleteByIdAndUserId(id, actor.userId()) == 0) {
			throw NotificationExceptions.notFound();
		}
	}

	/**
	 * Adds a notification unless the user switched notifications off in their settings. Runs in its own transaction:
	 * callers are after-commit listeners, whose original transaction is already over.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void notify(Long userId, NotificationType type, String title, String body, Map<String, Object> data) {
		if (!userSettings.notificationsEnabled(userId)) {
			log.debug("Notification skipped, switched off by the user userId={} type={}", userId, type.getValue());
			return;
		}
		repository.save(new Notification(userId, type, title, body, data));
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw NotificationExceptions.actionForbidden();
		}
	}

}
