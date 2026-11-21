package com.propertypro.property_platform.role.repository;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.ROLE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_VIEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RoleSchemaTests {

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void seedCreatesExplicitDefaultRoles() {
		assertThat(jdbc.queryForList("SELECT slug FROM roles ORDER BY id", String.class))
			.containsExactly("super-admin", "admin", "user");

		// user and admin permissions are replaced by V202610251300 (RolePermissionUpdateTests).
		Role superAdmin = roleRepository.findBySlug("super-admin").orElseThrow();
		assertThat(superAdmin.getName()).isEqualTo("Super Admin");
		assertThat(superAdmin.grantedPermissions()).contains(ADMIN_PANEL_ACCESS, ROLE_UPDATE, SUBSCRIPTION_PLAN_VIEW);
	}

	@Test
	void permissionsRoundTripAsJson() {
		Map<String, Map<String, Boolean>> permissions = Map.of("plans",
				Map.of("list", true, "change_status", true, "delete", false), "reports", Map.of("export", true));
		Role saved = roleRepository.saveAndFlush(new Role("Editor", "editor", permissions,
				Set.of("PLANS_LIST", "PLANS_CHANGE_STATUS", "REPORTS_EXPORT")));
		entityManager.clear();

		Role loaded = roleRepository.findById(saved.getId()).orElseThrow();
		assertThat(loaded.getPermissions()).isEqualTo(permissions);
		assertThat(loaded.getStatus()).isEqualTo(RoleStatus.ACTIVE);
		assertThat(loaded.getCreatedAt()).isNotNull();
		assertThat(loaded.getUpdatedAt()).isNotNull();
		assertThat(jdbc.queryForObject("SELECT jsonb_typeof(permissions -> 'plans' -> 'list') FROM roles WHERE id = ?",
				String.class, saved.getId())).isEqualTo("boolean");
		assertThat(jdbc.queryForObject("SELECT status FROM roles WHERE id = ?", String.class, saved.getId()))
			.isEqualTo("active");
	}

	// A violation aborts the test transaction, so each case is its own test.
	@Test
	void slugIsUnique() {
		assertThatThrownBy(() -> insert("admin", "{}")).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void slugOfSoftDeletedRoleIsNotReused() {
		insert("old-role", "{}");
		jdbc.update("UPDATE roles SET deleted_at = now() WHERE slug = 'old-role'");
		assertThatThrownBy(() -> insert("old-role", "{}")).isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "[]", "\"x\"", "{\"plans\": true}", "{\"plans\": [{\"list\": true}]}",
			"{\"plans\": {\"list\": \"true\"}}", "{\"plans\": {\"list\": null}}", "{\"plans\": {\"list\": [true]}}",
			"{\"Plans\": {\"list\": true}}", "{\"plans\": {\"list-all\": true}}" })
	void databaseRejectsMalformedPermissions(String permissions) {
		assertThatThrownBy(() -> insert("bad-role", permissions)).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void userResolvesToRoleThroughUserTypeOnlyWhileActiveAndNotDeleted() {
		Long adminId = insertUser("admin-user@example.com", "admin");
		Long appUserId = insertUser("app-user@example.com", "user");

		assertThat(roleRepository.findActiveRoleOfUser(adminId)).map(Role::getSlug).contains("admin");
		assertThat(roleRepository.findActiveRoleOfUser(appUserId)).map(Role::getSlug).contains("user");

		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'admin'");
		assertThat(roleRepository.findActiveRoleOfUser(adminId)).isEmpty();

		jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'admin'");
		entityManager.clear();
		assertThat(roleRepository.findActiveRoleOfUser(adminId)).isEmpty();
		assertThat(roleRepository.findBySlug("admin")).isEmpty();

		jdbc.update("UPDATE users SET deleted_at = now() WHERE id = ?", appUserId);
		assertThat(roleRepository.findActiveRoleOfUser(appUserId)).isEmpty();

		assertThat(jdbc.queryForList("SELECT user_type FROM users WHERE id IN (?, ?) ORDER BY id", String.class,
				adminId, appUserId)).containsExactly("admin", "user");
	}

	@Test
	void softDeleteKeepsTheRow() {
		Role role = roleRepository.saveAndFlush(new Role("Temp", "temp", Map.of(), Set.of()));

		role.checkDeletableBy(Set.of());
		roleRepository.delete(role);
		roleRepository.flush();
		entityManager.clear();

		assertThat(roleRepository.findById(role.getId())).isEmpty();
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM roles WHERE id = ?", Boolean.class,
				role.getId())).isTrue();
	}

	@Test
	void superAdminCannotBeDeactivatedDeletedOrChangedEvenByAdmins() {
		Role superAdmin = roleRepository.findBySlug("super-admin").orElseThrow();
		Set<String> everything = superAdmin.grantedPermissions();
		// The admin role holds every super-admin permission, so only the protection stops it.
		Set<String> adminPermissions = roleRepository.findBySlug("admin").orElseThrow().grantedPermissions();
		assertThat(adminPermissions).containsAll(everything);

		for (Set<String> grantor : List.of(everything, adminPermissions)) {
			assertThatThrownBy(() -> superAdmin.changeStatus(RoleStatus.INACTIVE, grantor))
				.hasFieldOrPropertyWithValue("code", "role_super_admin_protected");
			assertThatThrownBy(() -> superAdmin.checkDeletableBy(grantor))
				.hasFieldOrPropertyWithValue("code", "role_super_admin_protected");
			assertThatThrownBy(() -> superAdmin.replacePermissions(Map.of("admin_panel", Map.of("access", true)), grantor))
				.hasFieldOrPropertyWithValue("code", "role_super_admin_protected");
		}
		assertThatThrownBy(() -> roleRepository.delete(superAdmin)).isInstanceOf(ApiException.class);

		roleRepository.flush();
		entityManager.clear();
		Role reloaded = roleRepository.findBySlug("super-admin").orElseThrow();
		assertThat(reloaded.isActive()).isTrue();
		assertThat(reloaded.grantedPermissions()).isEqualTo(everything);
	}

	@Test
	void seedIsIdempotentAndKeepsCustomizedRoles() {
		List<Map<String, Object>> before = jdbc.queryForList("SELECT id, slug FROM roles ORDER BY id");
		jdbc.update("UPDATE roles SET name = 'Staff', status = 'inactive', "
				+ "permissions = '{\"admin_panel\": {\"access\": false}}' WHERE slug = 'admin'");
		jdbc.update("UPDATE roles SET deleted_at = now() WHERE slug = 'user'");

		jdbc.execute(script("db/migration/V202610251210__seed_roles.sql"));
		jdbc.execute(script("db/migration/V202610251210__seed_roles.sql"));

		assertThat(jdbc.queryForList("SELECT id, slug FROM roles ORDER BY id")).isEqualTo(before);
		assertThat(jdbc.queryForMap("SELECT name, status, permissions::text AS permissions FROM roles WHERE slug = 'admin'"))
			.containsEntry("name", "Staff")
			.containsEntry("status", "inactive")
			.containsEntry("permissions", "{\"admin_panel\": {\"access\": false}}");
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM roles WHERE slug = 'user'", Boolean.class))
			.isTrue();
	}

	@Test
	void rollbackRemovesOnlyRolesAndMigrationsReapply() {
		Long userId = insertUser("keep@example.com", "admin");

		jdbc.execute(script("db/rollback/U202610251300__update_user_admin_role_permissions.sql"));
		jdbc.execute(script("db/rollback/U202610251210__seed_roles.sql"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM roles", Integer.class)).isZero();
		jdbc.execute(script("db/rollback/U202610251200__create_roles.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('roles') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM flyway_schema_history WHERE version IN ('202610251200', '202610251210', '202610251300')",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT user_type FROM users WHERE id = ?", String.class, userId))
			.isEqualTo("admin");
		assertThat(List.of("users", "auth_sessions", "subscription_plans", "property_projects")).allSatisfy(
				table -> assertThat(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table))
					.as(table).isTrue());

		jdbc.execute(script("db/migration/V202610251200__create_roles.sql"));
		jdbc.execute(script("db/migration/V202610251210__seed_roles.sql"));
		jdbc.execute(script("db/migration/V202610251300__update_user_admin_role_permissions.sql"));
		jdbc.execute(script("db/migration/V202611211000__add_roles_description.sql"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM roles", Integer.class)).isEqualTo(3);
		assertThat(roleRepository.findBySlug("user").orElseThrow().grantedPermissions()).contains("LEAD_LIST");
	}

	private void insert(String slug, String permissions) {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Test', ?, ?::jsonb)", slug, permissions);
	}

	private Long insertUser(String email, String userType) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, user_type) VALUES (?, 'hash', 'Test', ?)
				RETURNING id""", Long.class, email, userType);
	}

	private static String script(String path) {
		try {
			return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
		}
		catch (IOException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
