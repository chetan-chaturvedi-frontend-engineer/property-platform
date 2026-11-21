package com.propertypro.property_platform.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/** A message for one user ({@code notifications}), created by the server from domain events. */
@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

	public static final int TITLE_MAX_LENGTH = 150;
	public static final int BODY_MAX_LENGTH = 500;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(nullable = false, updatable = false, length = 40)
	private NotificationType type;

	@Column(nullable = false, updatable = false, length = TITLE_MAX_LENGTH)
	private String title;

	@Column(nullable = false, updatable = false, length = BODY_MAX_LENGTH)
	private String body;

	/** Ids for deep links (propertyId, visitId); never personal details. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(updatable = false)
	private Map<String, Object> data;

	@Column(name = "read_at")
	private Instant readAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public Notification(Long userId, NotificationType type, String title, String body, Map<String, Object> data) {
		this.userId = userId;
		this.type = type;
		this.title = truncate(title, TITLE_MAX_LENGTH);
		this.body = truncate(body, BODY_MAX_LENGTH);
		this.data = data == null || data.isEmpty() ? null : Map.copyOf(data);
	}

	/** Idempotent: the first read time stays. */
	public void markRead(Instant at) {
		if (readAt == null) {
			readAt = at;
		}
	}

	private static String truncate(String text, int max) {
		return text.length() <= max ? text : text.substring(0, max - 1) + "…";
	}

}
