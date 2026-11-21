package com.propertypro.property_platform.notification.repository;

import com.propertypro.property_platform.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

/** Every lookup is by the owner's user id; a notification is never loaded by its own id alone. */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

	Page<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

	Page<Notification> findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

	Optional<Notification> findByIdAndUserId(Long id, Long userId);

	long countByUserIdAndReadAtIsNull(Long userId);

	@Modifying
	@Query("update Notification n set n.readAt = :at where n.userId = :userId and n.readAt is null")
	int markAllRead(Long userId, Instant at);

	@Modifying
	@Query("delete from Notification n where n.id = :id and n.userId = :userId")
	int deleteByIdAndUserId(Long id, Long userId);

}
