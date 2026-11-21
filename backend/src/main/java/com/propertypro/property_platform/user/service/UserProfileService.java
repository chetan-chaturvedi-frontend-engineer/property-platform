package com.propertypro.property_platform.user.service;

import com.propertypro.property_platform.auth.service.TokenService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.dto.ChangePasswordRequest;
import com.propertypro.property_platform.user.dto.DeleteAccountRequest;
import com.propertypro.property_platform.user.dto.UpdateProfileRequest;
import com.propertypro.property_platform.user.dto.UserResponse;
import com.propertypro.property_platform.user.event.AccountDeletedEvent;
import com.propertypro.property_platform.user.exception.UserProfileExceptions;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.propertypro.property_platform.security.Permissions.PROFILE_CHANGE_PASSWORD;
import static com.propertypro.property_platform.security.Permissions.PROFILE_DELETE;
import static com.propertypro.property_platform.security.Permissions.PROFILE_UPDATE;

/** What an app user does to their own account. Everything acts on the caller's id from the token. */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final TokenService tokenService;
	private final ApplicationEventPublisher events;

	@Transactional
	public UserResponse rename(CurrentActor actor, UpdateProfileRequest request) {
		requirePermission(actor, PROFILE_UPDATE);
		User user = find(actor);
		user.setFullName(request.fullName().strip());
		return UserResponse.from(userRepository.saveAndFlush(user));
	}

	/**
	 * Replaces the password after checking the current one, and ends every session including this one (the app signs
	 * the user in again), so a stolen session cannot outlive the change.
	 */
	@Transactional
	public void changePassword(CurrentActor actor, ChangePasswordRequest request) {
		requirePermission(actor, PROFILE_CHANGE_PASSWORD);
		User user = find(actor);
		requireCurrentPassword(user, request.currentPassword());
		if (passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw UserProfileExceptions.samePassword();
		}
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		userRepository.saveAndFlush(user);
		tokenService.revokeAllSessions(user.getId(), "password_changed");
		log.info("Password changed by the user userId={}", user.getId());
	}

	/**
	 * Soft delete: the email and phone stay reserved and the records are kept, but every session ends, the account
	 * cannot log in and its properties are archived (listeners of {@link AccountDeletedEvent}).
	 */
	@Transactional
	public void deleteAccount(CurrentActor actor, DeleteAccountRequest request) {
		requirePermission(actor, PROFILE_DELETE);
		User user = find(actor);
		requireCurrentPassword(user, request.password());
		userRepository.delete(user);
		userRepository.flush();
		tokenService.revokeAllSessions(user.getId(), "account_deleted");
		events.publishEvent(new AccountDeletedEvent(user.getId()));
		log.info("Account deleted by the user userId={}", user.getId());
	}

	private User find(CurrentActor actor) {
		return userRepository.findById(actor.userId()).orElseThrow(UserProfileExceptions::actionForbidden);
	}

	private void requireCurrentPassword(User user, String password) {
		if (!passwordEncoder.matches(password, user.getPasswordHash())) {
			throw UserProfileExceptions.passwordIncorrect();
		}
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw UserProfileExceptions.actionForbidden();
		}
	}

}
