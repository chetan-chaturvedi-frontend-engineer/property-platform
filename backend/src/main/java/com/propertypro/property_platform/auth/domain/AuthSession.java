package com.propertypro.property_platform.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.time.Instant;
import java.util.UUID;

/** One login. Access tokens carry its id ({@code sid}); revoking it revokes all its tokens. */
@Entity
@Table(name = "auth_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthSession implements Persistable<UUID> {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(name = "expires_at", nullable = false, updatable = false)
	private Instant expiresAt;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "revoked_reason", length = 30)
	private String revokedReason;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	// The id is assigned in code, so tell Spring Data the entity is new to skip a SELECT before INSERT.
	@Transient
	private boolean isNew = true;

	public AuthSession(UUID id, Long userId, Instant expiresAt, Instant createdAt) {
		this.id = id;
		this.userId = userId;
		this.expiresAt = expiresAt;
		this.createdAt = createdAt;
	}

	@Override
	public boolean isNew() {
		return isNew;
	}

	@PostLoad
	@PostPersist
	void markNotNew() {
		isNew = false;
	}

}
