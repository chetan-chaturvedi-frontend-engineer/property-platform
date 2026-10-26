package com.propertypro.property_platform.auth.repository;

import com.propertypro.property_platform.auth.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	Optional<RefreshToken> findByTokenHash(String tokenHash);

	/** Returns 0 if the token was already used, which means it is being replayed. */
	@Modifying
	@Query("update RefreshToken t set t.usedAt = :now where t.id = :id and t.usedAt is null")
	int markUsed(Long id, Instant now);

}
