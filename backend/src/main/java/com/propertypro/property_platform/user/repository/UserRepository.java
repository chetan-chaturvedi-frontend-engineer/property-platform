package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Derived queries exclude soft-deleted users; native queries state their own policy. */
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

	/** {@code email} must already be normalized (trimmed, lowercase). */
	Optional<User> findByEmail(String email);

	/** {@code phone} must already be normalized (E.164). */
	Optional<User> findByPhone(String phone);

	/** Includes soft-deleted users: their email and phone stay reserved. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM users WHERE email = :email OR phone = :phone)", nativeQuery = true)
	boolean existsByEmailOrPhoneIncludingDeleted(String email, String phone);

	/** Includes soft-deleted users (their email stays reserved); {@code excludeId} may be null. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM users WHERE email = :email AND id IS DISTINCT FROM :excludeId)",
			nativeQuery = true)
	boolean existsByEmailIncludingDeleted(String email, Long excludeId);

	/** Includes soft-deleted users (their phone stays reserved); {@code excludeId} may be null. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM users WHERE phone = :phone AND id IS DISTINCT FROM :excludeId)",
			nativeQuery = true)
	boolean existsByPhoneIncludingDeleted(String phone, Long excludeId);

	/** Non-deleted users per status, in one aggregate query (idx_users_status). */
	@Query(value = "SELECT status, count(*) AS total FROM users WHERE deleted_at IS NULL GROUP BY status",
			nativeQuery = true)
	List<StatusCount> countByStatus();

	interface StatusCount {

		String getStatus();

		long getTotal();

	}

	/** Includes soft-deleted users, whom audit views must still identify. Only ever select non-sensitive columns. */
	@Query(value = """
			SELECT id, full_name AS fullName, email, phone, status, user_type AS userType,
			       deleted_at IS NOT NULL AS deleted, created_at AS createdAt
			FROM users WHERE id IN (:ids)""", nativeQuery = true)
	List<AuditProfile> findAuditProfiles(Collection<Long> ids);

	/** Hard-deletes registrations never verified on any channel, freeing their email and phone. */
	@Modifying
	@Query(value = """
			DELETE FROM users
			WHERE status = 'pending' AND email_verified IS NULL AND phone_verified IS NULL
			  AND deleted_at IS NULL AND created_at < :createdBefore""", nativeQuery = true)
	int deleteUnverifiedPendingCreatedBefore(Instant createdBefore);

	interface AuditProfile {

		Long getId();

		String getFullName();

		String getEmail();

		String getPhone();

		String getStatus();

		String getUserType();

		boolean isDeleted();

		Instant getCreatedAt();

	}

}
