package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builders a property can be linked to: active users whose role ({@code users.user_type}) is
 * {@link #BUILDER_ROLE}. The dashboard lists them with {@code GET /api/v1/admin/users?userType=builder}; this
 * checks the chosen one. It selects data, it does not authorize anything.
 */
@Service
@RequiredArgsConstructor
public class PropertyBuilderService {

	/** Role slug of builder accounts. */
	public static final String BUILDER_ROLE = "builder";

	private final UserAccountService userAccountService;

	/** The builder account; a 400 on {@code builderUserId} unless it is an active user with the builder role. */
	@Transactional(readOnly = true)
	public UserSummary require(Long userId) {
		return userAccountService.findActiveOfType(userId, BUILDER_ROLE)
			.orElseThrow(() -> new FieldValidationException("builderUserId",
					"must be an active user with the builder role"));
	}

}
