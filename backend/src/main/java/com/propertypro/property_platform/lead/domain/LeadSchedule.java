package com.propertypro.property_platform.lead.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A planned call, follow-up, meeting or site visit of a {@link Lead}. Status changes go through
 * {@link #complete}, {@link #cancel} and {@link #rescheduleTo}, so a rescheduled activity keeps its
 * row and points forward to its replacement.
 */
@Entity
@Table(name = "lead_schedules")
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeadSchedule {

	public static final int TITLE_MAX_LENGTH = 150;
	public static final int DESCRIPTION_MAX_LENGTH = 5000;
	public static final int LOCATION_MAX_LENGTH = 255;
	public static final int COMPLETION_NOTE_MAX_LENGTH = 5000;
	public static final int MAX_DURATION_MINUTES = 1440;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	/** Must be a lead the current user may edit; never moved to another lead. */
	@NotNull
	@Column(name = "lead_id", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Long leadId;

	@NotNull
	@Column(name = "schedule_type", nullable = false, length = 20)
	private ScheduleType scheduleType;

	@NotBlank
	@Size(max = TITLE_MAX_LENGTH)
	@Column(nullable = false, length = TITLE_MAX_LENGTH)
	private String title;

	@Size(max = DESCRIPTION_MAX_LENGTH)
	@Column
	private String description;

	@NotNull
	@Column(name = "scheduled_at", nullable = false)
	private Instant scheduledAt;

	@Min(1)
	@Max(MAX_DURATION_MINUTES)
	@Column(name = "duration_minutes")
	private Integer durationMinutes;

	@Size(max = LOCATION_MAX_LENGTH)
	@Column(length = LOCATION_MAX_LENGTH)
	private String location;

	@Column(name = "assigned_to")
	private Long assignedTo;

	@Column(name = "created_by", updatable = false)
	@Setter(AccessLevel.NONE)
	private Long createdBy;

	@NotNull
	@Column(nullable = false, length = 20)
	@Setter(AccessLevel.NONE)
	private ScheduleStatus status = ScheduleStatus.PENDING;

	@Column(name = "reminder_at")
	private Instant reminderAt;

	@Column(name = "completed_at")
	@Setter(AccessLevel.NONE)
	private Instant completedAt;

	@Size(max = COMPLETION_NOTE_MAX_LENGTH)
	@Column(name = "completion_note")
	@Setter(AccessLevel.NONE)
	private String completionNote;

	/** The activity this one replaces. */
	@Column(name = "rescheduled_from_id", updatable = false)
	@Setter(AccessLevel.NONE)
	private Long rescheduledFromId;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	/** @param createdBy the authenticated user, or {@code null} for system-created activities */
	public LeadSchedule(Long leadId, Long createdBy, ScheduleType scheduleType, String title, Instant scheduledAt) {
		this.leadId = leadId;
		this.createdBy = createdBy;
		this.scheduleType = scheduleType;
		this.title = title;
		this.scheduledAt = scheduledAt;
	}

	public void complete(Instant completedAt, String completionNote) {
		requirePending();
		this.status = ScheduleStatus.COMPLETED;
		this.completedAt = completedAt;
		this.completionNote = completionNote;
	}

	public void cancel(String note) {
		requirePending();
		this.status = ScheduleStatus.CANCELLED;
		this.completionNote = note;
	}

	/** Corrects the note of a completed activity; other statuses keep theirs. */
	public void changeCompletionNote(String completionNote) {
		if (status != ScheduleStatus.COMPLETED) {
			throw new IllegalStateException("Schedule is " + status.getValue());
		}
		this.completionNote = completionNote;
	}

	/**
	 * Marks this activity rescheduled (keeping {@code reason} as its note) and returns its unsaved
	 * replacement at {@code scheduledAt}, copying the details. The caller saves both in one transaction.
	 */
	public LeadSchedule rescheduleTo(Instant scheduledAt, Instant reminderAt, Long createdBy, String reason) {
		requirePending();
		this.status = ScheduleStatus.RESCHEDULED;
		this.completionNote = reason;
		LeadSchedule next = new LeadSchedule(leadId, createdBy, scheduleType, title, scheduledAt);
		next.description = description;
		next.durationMinutes = durationMinutes;
		next.location = location;
		next.assignedTo = assignedTo;
		next.reminderAt = reminderAt;
		next.rescheduledFromId = id;
		return next;
	}

	private void requirePending() {
		if (status != ScheduleStatus.PENDING) {
			throw new IllegalStateException("Schedule is already " + status.getValue());
		}
	}

	@AssertTrue(message = "reminder must not be after the scheduled time")
	boolean isReminderBeforeSchedule() {
		return reminderAt == null || scheduledAt == null || !reminderAt.isAfter(scheduledAt);
	}

}
