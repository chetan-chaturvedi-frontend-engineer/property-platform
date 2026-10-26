package com.propertypro.property_platform.user.service;

import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/** Read access to user accounts for other modules, which must not use {@link UserRepository} directly. */
@Service
@RequiredArgsConstructor
public class UserAccountService {

	private final UserRepository userRepository;

	/** Empty for unknown or soft-deleted users. */
	@Transactional(readOnly = true)
	public Optional<AccountState> findAccountState(Long userId) {
		return userRepository.findById(userId)
			.map(user -> new AccountState(user.getStatus(), user.isEmailVerified() || user.isPhoneVerified()));
	}

	/** Summaries of the users that exist and are not soft-deleted, by id. */
	@Transactional(readOnly = true)
	public Map<Long, UserSummary> findSummaries(Collection<Long> userIds) {
		return userRepository.findAllById(userIds).stream()
			.collect(Collectors.toMap(User::getId, UserSummary::from, (a, b) -> a));
	}

	/**
	 * @param verified the account has a verified email or phone, the same rule that login applies
	 */
	public record AccountState(UserStatus status, boolean verified) {

		public boolean isActive() {
			return status == UserStatus.ACTIVE;
		}

	}

}
