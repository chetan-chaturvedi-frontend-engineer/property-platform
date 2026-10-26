package com.propertypro.property_platform.property.domain;

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

import java.time.Instant;

/** Append-only audit row: who changed a project's publication or legal status, when and why. */
@Entity
@Table(name = "property_project_status_changes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyStatusChange {

	public static final int REASON_MAX_LENGTH = 1000;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "property_project_id", nullable = false, updatable = false)
	private Long propertyProjectId;

	@Column(name = "actor_user_id", nullable = false, updatable = false)
	private Long actorUserId;

	@Column(nullable = false, updatable = false, length = 30)
	private StatusChangeAction action;

	@Column(name = "from_status", updatable = false, length = 30)
	private String fromStatus;

	@Column(name = "to_status", updatable = false, length = 30)
	private String toStatus;

	@Column(updatable = false, length = REASON_MAX_LENGTH)
	private String reason;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public PropertyStatusChange(Long propertyProjectId, Long actorUserId, StatusChangeAction action, String fromStatus,
			String toStatus, String reason) {
		this.propertyProjectId = propertyProjectId;
		this.actorUserId = actorUserId;
		this.action = action;
		this.fromStatus = fromStatus;
		this.toStatus = toStatus;
		this.reason = reason;
	}

}
