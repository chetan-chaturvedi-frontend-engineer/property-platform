package com.propertypro.property_platform.role.domain;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Permission checks and grantor rules. Super-admin rules need the seeded row: see RoleSchemaTests. */
class RoleTests {

	private static final Set<String> ALL = Set.of("PLANS_LIST", "PLANS_VIEW", "PLANS_DELETE", "USERS_LIST");

	@Test
	void onlyExplicitTrueGrants() {
		Role role = role(Map.of("plans", Map.of("list", true, "delete", false)));

		assertThat(role.isGranted("plans", "list")).isTrue();
		assertThat(role.isGranted("plans", "delete")).isFalse();
		assertThat(role.isGranted("plans", "view")).isFalse();
		assertThat(role.isGranted("users", "list")).isFalse();
		assertThat(role.isGranted(null, null)).isFalse();
		assertThat(role.grantedPermissions()).containsExactly("PLANS_LIST");
	}

	@Test
	void inactiveRoleGrantsNothing() {
		Role role = role(Map.of("plans", Map.of("list", true)));

		role.changeStatus(RoleStatus.INACTIVE, ALL);

		assertThat(role.isGranted("plans", "list")).isFalse();
		assertThat(role.grantedPermissions()).isEmpty();
		assertThat(role.getPermissions()).containsKey("plans");
	}

	@Test
	void permissionCodeIsUpperCaseModuleAndAction() {
		assertThat(Role.permissionCode("subscription_plan", "view")).isEqualTo("SUBSCRIPTION_PLAN_VIEW");
	}

	@Test
	void grantorCannotGrantPermissionsTheyLack() {
		assertThatThrownBy(() -> new Role("Ops", "ops", Map.of("plans", Map.of("delete", true)), Set.of("PLANS_LIST")))
			.isInstanceOf(ApiException.class)
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");

		Role role = role(Map.of("plans", Map.of("list", true)));
		assertThatThrownBy(() -> role.replacePermissions(Map.of("plans", Map.of("list", true, "delete", true)),
				Set.of("PLANS_LIST")))
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");
		assertThat(role.grantedPermissions()).containsExactly("PLANS_LIST");
	}

	@Test
	void grantorCannotStripOrDisableRolesAboveTheirLevel() {
		Role role = role(Map.of("plans", Map.of("list", true, "delete", true)));
		Set<String> weaker = Set.of("PLANS_LIST");

		assertThatThrownBy(() -> role.replacePermissions(Map.of(), weaker))
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");
		assertThatThrownBy(() -> role.changeStatus(RoleStatus.INACTIVE, weaker))
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");
		assertThatThrownBy(() -> role.checkDeletableBy(weaker))
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");
		assertThatThrownBy(() -> role.changeStatus(RoleStatus.INACTIVE, null))
			.hasFieldOrPropertyWithValue("code", "role_permission_escalation");
		assertThat(role.isActive()).isTrue();
	}

	@Test
	void superAdminSlugCannotBeCreatedByTheApplication() {
		assertThatThrownBy(() -> new Role("Root", Role.SUPER_ADMIN_SLUG, Map.of(), ALL))
			.hasFieldOrPropertyWithValue("code", "role_slug_reserved");
	}

	@Test
	void rejectsMalformedPermissions() {
		Map<String, Map<String, Boolean>> nullAction = new HashMap<>();
		Map<String, Boolean> actions = new HashMap<>();
		actions.put("list", null);
		nullAction.put("plans", actions);

		List.of(Map.of("Plans", Map.of("list", true)), Map.of("plans", Map.of("list-all", true)), nullAction)
			.forEach(permissions -> assertThatThrownBy(() -> new Role("Ops", "ops", permissions, ALL))
				.isInstanceOf(FieldValidationException.class));
	}

	@Test
	void permissionsViewIsReadOnly() {
		Role role = role(Map.of("plans", Map.of("list", true)));

		assertThatThrownBy(() -> role.getPermissions().get("plans").put("delete", true))
			.isInstanceOf(UnsupportedOperationException.class);
		assertThat(role.isGranted("plans", "delete")).isFalse();
	}

	private static Role role(Map<String, Map<String, Boolean>> permissions) {
		return new Role("Ops", "ops", permissions, ALL);
	}

}
