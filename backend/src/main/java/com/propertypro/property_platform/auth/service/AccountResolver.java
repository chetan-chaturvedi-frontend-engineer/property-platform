package com.propertypro.property_platform.auth.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

/** Normalizes email/phone identifiers and finds the matching user-type account. */
@Component
@RequiredArgsConstructor
public class AccountResolver {

	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final UserRepository userRepository;

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	public Optional<Identifier> parse(String raw) {
		if (raw == null || raw.isBlank()) {
			return Optional.empty();
		}
		if (raw.contains("@")) {
			return Optional.of(new Identifier(Identifier.Type.EMAIL, normalizeEmail(raw)));
		}
		return phoneNumberNormalizer.normalize(raw).map(phone -> new Identifier(Identifier.Type.PHONE, phone));
	}

	public Identifier parseOrReject(String raw) {
		return parse(raw).orElseThrow(
				() -> new FieldValidationException("identifier", "must be a valid email address or phone number"));
	}

	/** Non-deleted account of the app {@code user} type; staff and other types are never returned. */
	public Optional<User> findUser(Identifier identifier) {
		return findAnyUser(identifier).filter(u -> User.DEFAULT_USER_TYPE.equals(u.getUserType()));
	}

	/**
	 * Non-deleted account of any type. Only for the admin login, which then requires the role's
	 * admin-panel permission.
	 */
	public Optional<User> findAnyUser(Identifier identifier) {
		return switch (identifier.type()) {
			case EMAIL -> userRepository.findByEmail(identifier.value());
			case PHONE -> userRepository.findByPhone(identifier.value());
		};
	}

	public static boolean isVerified(User user, Identifier identifier) {
		return switch (identifier.type()) {
			case EMAIL -> user.isEmailVerified();
			case PHONE -> user.isPhoneVerified();
		};
	}

}
