package com.propertypro.property_platform.builderteam.domain;

import com.propertypro.property_platform.builderteam.exception.BuilderTeamExceptions;
import com.propertypro.property_platform.role.domain.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * An employee's membership in a builder's team ({@code builder_teams}). Builder, employee and inviter
 * are user ids fixed at creation. Status changes only through the lifecycle methods, so
 * {@code chk_builder_teams_joined_at} always holds.
 * <p>
 * The role slug and permissions are stored as given: the service must check that the role is an active
 * role the builder may assign and that the grantor holds every permission it grants (as {@link Role}
 * does), and must scope these permissions to the builder's own data.
 */
@Entity
@Table(name = "builder_teams")
// Deletes set deleted_at; the membership stays as history.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@DynamicUpdate
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuilderTeamMember {

	public static final int NOTES_MAX_LENGTH = 2000;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Who created the invitation. */
	@NotNull
	@Column(name = "user_id", nullable = false, updatable = false)
	private Long invitedBy;

	@NotNull
	@Column(name = "builder_id", nullable = false, updatable = false)
	private Long builderId;

	@NotNull
	@Column(name = "employee_id", nullable = false, updatable = false)
	private Long employeeId;

	/** A {@code roles.slug}. */
	@Setter
	@NotNull
	@Size(max = Role.SLUG_MAX_LENGTH)
	@Pattern(regexp = Role.SLUG_PATTERN)
	@Column(nullable = false, length = Role.SLUG_MAX_LENGTH)
	private String role;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false)
	@Getter(AccessLevel.NONE)
	private Map<String, Map<String, Boolean>> permissions = new LinkedHashMap<>();

	@Column(nullable = false, length = 20)
	private BuilderTeamStatus status = BuilderTeamStatus.PENDING;

	@Column(name = "joined_at")
	private Instant joinedAt;

	@Setter
	@Size(max = NOTES_MAX_LENGTH)
	@Column(columnDefinition = "text")
	private String notes;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/** A pending invitation. */
	public BuilderTeamMember(Long invitedBy, Long builderId, Long employeeId, String role,
			Map<String, Map<String, Boolean>> permissions) {
		if (Objects.equals(builderId, employeeId)) {
			throw BuilderTeamExceptions.selfMembership();
		}
		this.invitedBy = invitedBy;
		this.builderId = builderId;
		this.employeeId = employeeId;
		this.role = role;
		replacePermissions(permissions);
	}

	/** Defensive copy of the stored JSON, including {@code false} entries. */
	public Map<String, Map<String, Boolean>> getPermissions() {
		Map<String, Map<String, Boolean>> copy = new LinkedHashMap<>();
		if (permissions != null) {
			permissions.forEach((module, actions) -> copy.put(module, Collections.unmodifiableMap(new LinkedHashMap<>(actions))));
		}
		return Collections.unmodifiableMap(copy);
	}

	/** Stores the grants as given; the caller has already checked the grantor holds them. */
	public void replacePermissions(Map<String, Map<String, Boolean>> permissions) {
		Map<String, Map<String, Boolean>> copy = new LinkedHashMap<>();
		if (permissions != null) {
			permissions.forEach((module, actions) -> copy.put(module, new LinkedHashMap<>(actions)));
		}
		this.permissions = copy;
	}

	/** Grants permissions only while active. */
	public boolean isActive() {
		return status == BuilderTeamStatus.ACTIVE;
	}

	/** The employee accepts the invitation. */
	public void accept(Instant now) {
		changeStatus(BuilderTeamStatus.ACTIVE);
		joinedAt = now;
	}

	public void reject() {
		changeStatus(BuilderTeamStatus.REJECTED);
	}

	public void deactivate() {
		changeStatus(BuilderTeamStatus.INACTIVE);
	}

	/** Keeps the original {@code joinedAt}. */
	public void reactivate() {
		if (status != BuilderTeamStatus.INACTIVE) {
			throw BuilderTeamExceptions.invalidStatusTransition(status, BuilderTeamStatus.ACTIVE);
		}
		status = BuilderTeamStatus.ACTIVE;
	}

	/** Withdraws an open invitation or ends a membership. */
	public void revoke() {
		changeStatus(BuilderTeamStatus.REVOKED);
	}

	private void changeStatus(BuilderTeamStatus next) {
		if (next == BuilderTeamStatus.ACTIVE && status != BuilderTeamStatus.PENDING || !status.canChangeTo(next)) {
			throw BuilderTeamExceptions.invalidStatusTransition(status, next);
		}
		status = next;
	}

}
