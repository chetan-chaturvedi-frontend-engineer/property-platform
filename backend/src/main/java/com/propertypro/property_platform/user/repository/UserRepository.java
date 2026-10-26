package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

/** Derived queries exclude soft-deleted users; native queries state their own policy. */
public interface UserRepository extends JpaRepository<User, Long> {

	/** {@code email} must already be normalized (trimmed, lowercase). */
	Optional<User> findByEmail(String email);

	/** {@code phone} must already be normalized (E.164). */
	Optional<User> findByPhone(String phone);

	/** Includes soft-deleted users: their email and phone stay reserved. */
	@Query(value = "SELECT EXISTS (SELECT 1 FROM users WHERE email = :email OR phone = :phone)", nativeQuery = true)
	boolean existsByEmailOrPhoneIncludingDeleted(String email, String phone);

	/** Hard-deletes registrations never verified on any channel, freeing their email and phone. */
	@Modifying
	@Query(value = """
			DELETE FROM users
			WHERE status = 'pending' AND email_verified IS NULL AND phone_verified IS NULL
			  AND deleted_at IS NULL AND created_at < :createdBefore""", nativeQuery = true)
	int deleteUnverifiedPendingCreatedBefore(Instant createdBefore);

}
