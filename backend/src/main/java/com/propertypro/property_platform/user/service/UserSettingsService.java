package com.propertypro.property_platform.user.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.domain.UserSettings;
import com.propertypro.property_platform.user.domain.UserTheme;
import com.propertypro.property_platform.user.dto.UserSettingsRequest;
import com.propertypro.property_platform.user.dto.UserSettingsResponse;
import com.propertypro.property_platform.user.exception.UserSettingsExceptions;
import com.propertypro.property_platform.user.repository.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

import static com.propertypro.property_platform.security.Permissions.USER_SETTING_CREATE;
import static com.propertypro.property_platform.security.Permissions.USER_SETTING_UPDATE;
import static com.propertypro.property_platform.security.Permissions.USER_SETTING_VIEW;

/**
 * The caller's own settings, at most one row per user. Every query is by the caller's id from the token, so
 * there is no id to probe and no way to address another user's settings.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSettingsService {

	private static final String ONE_ROW_PER_USER = "uq_user_settings_user_id";

	private final UserSettingsRepository repository;

	/**
	 * Whether the user wants notifications at all (the master switch). Users who never saved settings get the
	 * defaults, which is on.
	 */
	@Transactional(readOnly = true)
	public boolean notificationsEnabled(Long userId) {
		return repository.findByUserId(userId).map(UserSettings::isNotificationEnabled).orElse(true);
	}

	@Transactional(readOnly = true)
	public UserSettingsResponse get(CurrentActor actor) {
		requirePermission(actor, USER_SETTING_VIEW);
		return UserSettingsResponse.from(repository.findByUserId(actor.userId())
			.orElseThrow(UserSettingsExceptions::notFound));
	}

	/**
	 * Creates the caller's settings: the given fields, defaults for the rest. 409 when they already exist,
	 * also for concurrent first requests, which the unique index on {@code user_id} lets through only once.
	 */
	@Transactional
	public UserSettingsResponse create(CurrentActor actor, UserSettingsRequest request) {
		requirePermission(actor, USER_SETTING_CREATE);
		if (repository.existsByUserId(actor.userId())) {
			throw UserSettingsExceptions.alreadyExists();
		}
		UserSettings settings = new UserSettings(actor.userId());
		apply(settings, request);
		try {
			repository.saveAndFlush(settings);
		}
		catch (DataIntegrityViolationException ex) {
			String cause = ex.getMostSpecificCause().getMessage();
			if (cause != null && cause.contains(ONE_ROW_PER_USER)) {
				throw UserSettingsExceptions.alreadyExists();
			}
			throw ex;
		}
		log.info("User settings created userId={} fields={}", actor.userId(), request.presentFields());
		return UserSettingsResponse.from(settings);
	}

	/** Changes only the fields sent; at least one is required. 404 until the settings are created. */
	@Transactional
	public UserSettingsResponse update(CurrentActor actor, UserSettingsRequest request) {
		requirePermission(actor, USER_SETTING_UPDATE);
		Set<String> present = request.presentFields();
		if (present.isEmpty()) {
			throw new FieldValidationException("body", "must contain at least one setting to change");
		}
		UserSettings settings = repository.findByUserIdForUpdate(actor.userId())
			.orElseThrow(UserSettingsExceptions::notFound);
		apply(settings, request);
		repository.flush();
		log.info("User settings updated userId={} fields={}", actor.userId(), present);
		return UserSettingsResponse.from(settings);
	}

	private static void apply(UserSettings settings, UserSettingsRequest request) {
		apply(request.getLocation(), value -> settings.setLocation(value == null ? null : value.strip()));
		apply(request.getTheme(), value -> settings.setTheme(UserTheme.fromValue(value)));
		apply(request.getLanguage(), settings::setLanguage);
		apply(request.getNotificationEnabled(), settings::setNotificationEnabled);
		apply(request.getEmailNotifications(), settings::setEmailNotifications);
		apply(request.getPushNotifications(), settings::setPushNotifications);
		apply(request.getSmsNotifications(), settings::setSmsNotifications);
		apply(request.getTimezone(), settings::setTimezone);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw UserSettingsExceptions.actionForbidden();
		}
	}

	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

}
