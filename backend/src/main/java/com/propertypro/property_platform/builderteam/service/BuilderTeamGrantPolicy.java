package com.propertypro.property_platform.builderteam.service;

import com.propertypro.property_platform.builderteam.exception.BuilderTeamExceptions;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.service.ResolvedRole;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;

/**
 * Who may be on a team and what a membership may grant. A team works on its builder's own data, so a
 * membership can never carry more than the builder holds right now:
 * <ul>
 * <li>builders and employees are active app accounts (their role has no admin panel access);</li>
 * <li>a role is an active role without admin panel access whose permissions the builder all holds;</li>
 * <li>permissions are codes the builder holds, never {@code ADMIN_PANEL_ACCESS} or an {@code _ANY} code.</li>
 * </ul>
 * Unknown and ineligible users get the same message, so ids and accounts cannot be probed.
 */
@Component
@RequiredArgsConstructor
class BuilderTeamGrantPolicy {

	private static final String ANY_SUFFIX = "_ANY";
	private static final String BUILDER_NOT_ELIGIBLE = "must be an active app user";
	static final String EMPLOYEE_NOT_ELIGIBLE = "must belong to an active, verified app user";
	private static final String ROLE_NOT_ASSIGNABLE = "must be an active team role within the builder's own permissions";

	private final UserAccountService userAccountService;
	private final RolePermissionService rolePermissionService;

	/** The builder's current permission codes; throws unless the builder is an active app account. */
	Set<String> requireEligibleBuilder(Long builderId) {
		boolean active = userAccountService.findAccountState(builderId)
			.map(UserAccountService.AccountState::isActive)
			.orElse(false);
		Set<String> permissions = active ? rolePermissionService.permissionsOfUser(builderId) : Set.of();
		if (!active || permissions.contains(ADMIN_PANEL_ACCESS)) {
			throw new FieldValidationException("builderId", BUILDER_NOT_ELIGIBLE);
		}
		return permissions;
	}

	/** An active, verified app account other than the builder. */
	void requireEligibleEmployee(Long employeeId, Long builderId, String field) {
		if (Objects.equals(employeeId, builderId)) {
			throw BuilderTeamExceptions.selfMembership();
		}
		boolean eligible = userAccountService.findAccountState(employeeId)
			.map(state -> state.isActive() && state.verified())
			.orElse(false);
		if (!eligible || rolePermissionService.permissionsOfUser(employeeId).contains(ADMIN_PANEL_ACCESS)) {
			throw new FieldValidationException(field, EMPLOYEE_NOT_ELIGIBLE);
		}
	}

	void requireAssignableRole(String slug, Set<String> builderPermissions) {
		boolean assignable = rolePermissionService.findActiveRole(slug)
			.filter(role -> !Role.SUPER_ADMIN_SLUG.equals(role.slug()))
			.filter(role -> !role.grants(ADMIN_PANEL_ACCESS))
			.map(ResolvedRole::permissions)
			.filter(builderPermissions::containsAll)
			.isPresent();
		if (!assignable) {
			throw new FieldValidationException("role", ROLE_NOT_ASSIGNABLE);
		}
	}

	/** Every granted ({@code true}) code must be delegable by the builder; {@code false} entries grant nothing. */
	void requireDelegablePermissions(Map<String, Map<String, Boolean>> permissions, Set<String> builderPermissions) {
		Set<String> refused = new LinkedHashSet<>();
		for (String code : grantedCodes(permissions)) {
			if (code.equals(ADMIN_PANEL_ACCESS) || code.endsWith(ANY_SUFFIX) || !builderPermissions.contains(code)) {
				refused.add(code);
			}
		}
		if (!refused.isEmpty()) {
			throw new FieldValidationException("permissions",
					"must only grant the builder's own permissions; not allowed: " + String.join(", ", refused));
		}
	}

	static boolean grantsAnything(Map<String, Map<String, Boolean>> permissions) {
		return !grantedCodes(permissions).isEmpty();
	}

	private static Set<String> grantedCodes(Map<String, Map<String, Boolean>> permissions) {
		Set<String> codes = new LinkedHashSet<>();
		if (permissions != null) {
			permissions.forEach((module, actions) -> actions.forEach((action, granted) -> {
				if (Boolean.TRUE.equals(granted)) {
					codes.add(Role.permissionCode(module, action));
				}
			}));
		}
		return codes;
	}

}
