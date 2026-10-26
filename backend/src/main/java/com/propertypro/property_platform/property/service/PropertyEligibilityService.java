package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.service.UserAccountService;
import com.propertypro.property_platform.user.service.UserAccountService.AccountState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE_WITHOUT_SUBSCRIPTION;

/**
 * Whether a user may add a property: the role permission, an active and verified account (email or
 * phone, as for login), and, unless the role grants {@code PROPERTY_CREATE_WITHOUT_SUBSCRIPTION}, a
 * subscription in force with a free property slot ({@link PropertyLimitGuard}, which locks the
 * subscription so concurrent creations cannot exceed the limit). Nothing comes from the request.
 */
@Service
@RequiredArgsConstructor
public class PropertyEligibilityService {

	private final UserAccountService userAccountService;
	private final RolePermissionService rolePermissionService;
	private final PropertyLimitGuard limitGuard;

	/** Must run in the transaction that inserts the property. */
	@Transactional(propagation = Propagation.MANDATORY)
	public void requireCanCreate(CurrentActor actor) {
		boolean unlimited = actor.has(PROPERTY_CREATE_WITHOUT_SUBSCRIPTION);
		if (!unlimited && !actor.has(PROPERTY_CREATE)) {
			throw PropertyExceptions.actionForbidden();
		}
		requireActiveVerifiedAccount(actor.userId());
		if (!unlimited) {
			limitGuard.requireCapacityForNewProject(actor.userId());
		}
	}

	/**
	 * Restoring a deleted property takes one of the owner's slots again, so the owner's limit applies
	 * (unless the owner's role grants unlimited properties). The restoring admin's own plan is irrelevant.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void requireOwnerCapacityForRestore(Long ownerId) {
		if (!rolePermissionService.permissionsOfUser(ownerId).contains(PROPERTY_CREATE_WITHOUT_SUBSCRIPTION)) {
			limitGuard.requireCapacityForNewProject(ownerId);
		}
	}

	private void requireActiveVerifiedAccount(Long userId) {
		AccountState account = userAccountService.findAccountState(userId)
			.orElseThrow(PropertyExceptions::accountInactive);
		// Pending accounts are unverified: tell them what to do rather than that they are inactive.
		if (!account.verified()) {
			throw PropertyExceptions.accountVerificationRequired();
		}
		if (!account.isActive()) {
			throw PropertyExceptions.accountInactive();
		}
	}

}
