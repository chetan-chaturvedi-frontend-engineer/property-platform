package com.propertypro.property_platform.auth.repository;

import com.propertypro.property_platform.auth.domain.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

	/**
	 * Checked on every authenticated request: the session is live and its user still active and not
	 * deleted, so blocking a user takes effect immediately. The user type is deliberately not checked:
	 * what a session may do comes from the role's permissions, loaded on every request.
	 */
	@Query(value = """
			SELECT EXISTS (
			  SELECT 1 FROM auth_sessions s JOIN users u ON u.id = s.user_id
			  WHERE s.id = :sessionId AND s.user_id = :userId AND s.revoked_at IS NULL AND s.expires_at > :now
			    AND u.deleted_at IS NULL AND u.status = 'active')""", nativeQuery = true)
	boolean isActive(UUID sessionId, Long userId, Instant now);

	@Modifying
	@Query("""
			update AuthSession s set s.revokedAt = :now, s.revokedReason = :reason
			where s.id = :sessionId and s.revokedAt is null""")
	int revoke(UUID sessionId, Instant now, String reason);

	@Modifying
	@Query("""
			update AuthSession s set s.revokedAt = :now, s.revokedReason = :reason
			where s.userId = :userId and s.revokedAt is null""")
	int revokeAllForUser(Long userId, Instant now, String reason);

	/** Refresh tokens are removed by ON DELETE CASCADE. */
	@Modifying
	@Query("delete from AuthSession s where s.expiresAt < :before or s.revokedAt < :before")
	int deleteFinishedBefore(Instant before);

}
