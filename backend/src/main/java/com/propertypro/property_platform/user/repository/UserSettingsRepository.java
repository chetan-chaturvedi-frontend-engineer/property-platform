package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.UserSettings;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/** Every lookup is by the owner's user id; settings are never loaded by their own id alone. */
public interface UserSettingsRepository extends JpaRepository<UserSettings, Long> {

	Optional<UserSettings> findByUserId(Long userId);

	boolean existsByUserId(Long userId);

	/** The user's settings, row-locked until the transaction ends, so concurrent updates run one after another. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select s from UserSettings s where s.userId = :userId")
	Optional<UserSettings> findByUserIdForUpdate(Long userId);

}
