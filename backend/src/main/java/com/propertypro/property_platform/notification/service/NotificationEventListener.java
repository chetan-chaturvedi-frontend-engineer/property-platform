package com.propertypro.property_platform.notification.service;

import com.propertypro.property_platform.lead.event.SiteVisitBookedEvent;
import com.propertypro.property_platform.notification.config.NotificationAsyncConfig;
import com.propertypro.property_platform.notification.domain.NotificationType;
import com.propertypro.property_platform.property.event.PropertyStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * Turns domain events into notifications. Runs after the originating transaction committed and off the request
 * thread, so a failing notification can never undo or slow down a booking or a review decision.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

	private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

	private final NotificationService notifications;

	@Async(NotificationAsyncConfig.EXECUTOR)
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onSiteVisitBooked(SiteVisitBookedEvent event) {
		String when = event.visitDate().format(DATE) + " at " + event.visitTime().format(TIME);
		Map<String, Object> data = Map.of("propertyId", event.propertyId(), "visitId", event.visitId());
		safely(() -> {
			notifications.notify(event.builderId(), NotificationType.SITE_VISIT_BOOKED, "New site visit booked",
					"%s booked a visit to %s on %s.".formatted(event.visitorName(), event.projectName(), when), data);
			notifications.notify(event.visitorId(), NotificationType.SITE_VISIT_BOOKED, "Site visit booked",
					"Your visit to %s on %s is booked (%s).".formatted(event.projectName(), when, event.visitCode()),
					data);
		});
	}

	@Async(NotificationAsyncConfig.EXECUTOR)
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onPropertyStatusChanged(PropertyStatusChangedEvent event) {
		if (event.actorUserId().equals(event.ownerId())) {
			return;
		}
		String title;
		switch (event.toStatus()) {
			case "approved" -> title = "Your property was approved";
			case "rejected" -> title = "Your property was rejected";
			case "published" -> title = "Your property is live";
			case "suspended" -> title = "Your property was suspended";
			default -> {
				return;
			}
		}
		String body = event.projectName() + (event.reason() == null ? "" : ": " + event.reason());
		safely(() -> notifications.notify(event.ownerId(), NotificationType.PROPERTY_STATUS_CHANGED, title, body,
				Map.of("propertyId", event.propertyId())));
	}

	private static void safely(Runnable action) {
		try {
			action.run();
		}
		catch (RuntimeException ex) {
			log.warn("Notification could not be created", ex);
		}
	}

}
