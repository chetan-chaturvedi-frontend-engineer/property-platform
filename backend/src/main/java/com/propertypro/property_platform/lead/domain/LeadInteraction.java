package com.propertypro.property_platform.lead.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
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
 * One entry in a {@link Lead}'s communication history. {@code interactionAt} is when it happened,
 * which may be earlier than {@code createdAt} (when it was recorded).
 */
@Entity
@Table(name = "lead_interactions")
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeadInteraction {

	public static final int NOTE_MAX_LENGTH = 10_000;

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
	@Column(nullable = false, length = 20)
	private InteractionType type;

	@Size(max = NOTE_MAX_LENGTH)
	@Column
	private String note;

	/** NULL for system-recorded interactions. */
	@Column(name = "interacted_by", updatable = false)
	@Setter(AccessLevel.NONE)
	private Long interactedBy;

	@NotNull
	@Column(name = "interaction_at", nullable = false)
	private Instant interactionAt;

	@Column(length = 30)
	private InteractionOutcome outcome;

	@Column(name = "next_follow_up_at")
	private Instant nextFollowUpAt;

	@PositiveOrZero
	@Column(name = "duration_seconds")
	private Integer durationSeconds;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public LeadInteraction(Long leadId, Long interactedBy, InteractionType type, Instant interactionAt) {
		this.leadId = leadId;
		this.interactedBy = interactedBy;
		this.type = type;
		this.interactionAt = interactionAt;
	}

}
