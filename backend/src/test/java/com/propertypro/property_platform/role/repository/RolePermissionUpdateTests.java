package com.propertypro.property_platform.role.repository;

import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_ASSIGN_ROLE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_CREATE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_CREATE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_DELETE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_LIST;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MANAGE_PERMISSIONS;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MANAGE_STATUS;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MEMBERSHIP_RESPOND;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MEMBERSHIP_VIEW;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_UPDATE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_VIEW;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_VIEW_ANY;
import static com.propertypro.property_platform.security.Permissions.ADMIN_PANEL_ACCESS;
import static com.propertypro.property_platform.security.Permissions.BANNER_CHANGE_STATUS;
import static com.propertypro.property_platform.security.Permissions.BANNER_CREATE;
import static com.propertypro.property_platform.security.Permissions.BANNER_DELETE;
import static com.propertypro.property_platform.security.Permissions.BANNER_LIST;
import static com.propertypro.property_platform.security.Permissions.BANNER_UPDATE;
import static com.propertypro.property_platform.security.Permissions.BANNER_VIEW;
import static com.propertypro.property_platform.security.Permissions.BLOG_CATEGORY_CREATE;
import static com.propertypro.property_platform.security.Permissions.BLOG_CATEGORY_DELETE;
import static com.propertypro.property_platform.security.Permissions.BLOG_CATEGORY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.BLOG_CATEGORY_VIEW;
import static com.propertypro.property_platform.security.Permissions.BLOG_CREATE;
import static com.propertypro.property_platform.security.Permissions.BLOG_DELETE;
import static com.propertypro.property_platform.security.Permissions.BLOG_UPDATE;
import static com.propertypro.property_platform.security.Permissions.BLOG_VIEW;
import static com.propertypro.property_platform.security.Permissions.FAQ_CREATE;
import static com.propertypro.property_platform.security.Permissions.FAQ_DELETE;
import static com.propertypro.property_platform.security.Permissions.FAQ_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.FAQ_UPDATE;
import static com.propertypro.property_platform.security.Permissions.FAQ_VIEW;
import static com.propertypro.property_platform.security.Permissions.PAGE_CREATE;
import static com.propertypro.property_platform.security.Permissions.PAGE_DELETE;
import static com.propertypro.property_platform.security.Permissions.PAGE_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.PAGE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PAGE_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_ASSIGN;
import static com.propertypro.property_platform.security.Permissions.LEAD_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_LIST;
import static com.propertypro.property_platform.security.Permissions.LEAD_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.LEAD_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_VIEW_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE_WITHOUT_SUBSCRIPTION;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LEGAL_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_PUBLISH;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_RESTORE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_REVIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_SUSPEND;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW_ANY;
import static com.propertypro.property_platform.security.Permissions.ROLE_CREATE;
import static com.propertypro.property_platform.security.Permissions.ROLE_DELETE;
import static com.propertypro.property_platform.security.Permissions.ROLE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.ROLE_VIEW;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ASSIGN;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ASSIGN_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_CREATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_CREATE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_LIST;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_SUBMIT_REPORT;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_SUBMIT_REPORT_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_STATUS;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_STATUS_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_VIEW;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_VIEW_ANY;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_CHANGE_STATUS;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_CREATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_LIST;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SUBSCRIPTION_PLAN_VIEW;
import static com.propertypro.property_platform.security.Permissions.USER_SETTING_CREATE;
import static com.propertypro.property_platform.security.Permissions.USER_SETTING_UPDATE;
import static com.propertypro.property_platform.security.Permissions.USER_SETTING_VIEW;
import static org.assertj.core.api.Assertions.assertThat;

/** V202610251300: user and admin role permissions. Each test is rolled back. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RolePermissionUpdateTests {

	private static final String MIGRATION = "db/migration/V202610251300__update_user_admin_role_permissions.sql";
	private static final Set<String> USER_PERMISSIONS = Set.of(LEAD_LIST, LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE,
			LEAD_DELETE);
	/** Added to the user role later by V202610251500. */
	private static final Set<String> USER_PROPERTY_PERMISSIONS = Set.of(PROPERTY_CREATE, PROPERTY_LIST, PROPERTY_VIEW,
			PROPERTY_UPDATE, PROPERTY_DELETE);
	/** Added to the admin role later by V202610251500. */
	private static final Set<String> ADMIN_PROPERTY_PERMISSIONS = Set.of(PROPERTY_CREATE,
			PROPERTY_CREATE_WITHOUT_SUBSCRIPTION, PROPERTY_LIST_ANY, PROPERTY_VIEW_ANY, PROPERTY_UPDATE_ANY,
			PROPERTY_DELETE_ANY, PROPERTY_RESTORE_ANY, PROPERTY_REVIEW, PROPERTY_PUBLISH, PROPERTY_SUSPEND,
			PROPERTY_LEGAL_REVIEW);
	/** Added to the admin role (only) later by V202610251710. */
	private static final Set<String> ADMIN_BANNER_PERMISSIONS = Set.of(BANNER_LIST, BANNER_VIEW, BANNER_CREATE,
			BANNER_UPDATE, BANNER_CHANGE_STATUS, BANNER_DELETE);
	/** Added to the admin role (only) later by V202610251900. */
	private static final Set<String> ADMIN_BLOG_CATEGORY_PERMISSIONS = Set.of(BLOG_CATEGORY_VIEW, BLOG_CATEGORY_CREATE,
			BLOG_CATEGORY_UPDATE, BLOG_CATEGORY_DELETE);
	/** Added to the admin role (only) later by V202610252000. */
	private static final Set<String> ADMIN_BLOG_PERMISSIONS = Set.of(BLOG_VIEW, BLOG_CREATE, BLOG_UPDATE, BLOG_DELETE);
	private static final Set<String> ADMIN_FAQ_PERMISSIONS = Set.of(FAQ_VIEW, FAQ_CREATE, FAQ_UPDATE, FAQ_PUBLISH,
			FAQ_DELETE);
	private static final Set<String> ADMIN_PAGE_PERMISSIONS = Set.of(PAGE_VIEW, PAGE_CREATE, PAGE_UPDATE,
			PAGE_PUBLISH, PAGE_DELETE);
	/** Added to the user and admin roles later by V202610261430. */
	private static final Set<String> LEAD_CHILD_PERMISSIONS = Set.of(LEAD_SCHEDULE_VIEW, LEAD_SCHEDULE_CREATE,
			LEAD_SCHEDULE_UPDATE, LEAD_SCHEDULE_DELETE, LEAD_INTERACTION_VIEW, LEAD_INTERACTION_CREATE,
			LEAD_INTERACTION_UPDATE, LEAD_INTERACTION_DELETE);
	/** Added to the admin role (only) later by V202610261430. */
	private static final Set<String> ADMIN_LEAD_PERMISSIONS = Set.of(LEAD_CREATE, LEAD_ASSIGN);
	/** Added to the user role later by V202610271110. */
	private static final Set<String> USER_SITE_VISIT_PERMISSIONS = Set.of(SITE_VISIT_LIST, SITE_VISIT_VIEW,
			SITE_VISIT_CREATE, SITE_VISIT_UPDATE, SITE_VISIT_UPDATE_STATUS, SITE_VISIT_SUBMIT_REPORT, SITE_VISIT_ASSIGN);
	/** Added to the admin role later by V202610271110. */
	private static final Set<String> ADMIN_SITE_VISIT_PERMISSIONS = Set.of(SITE_VISIT_LIST_ANY, SITE_VISIT_VIEW_ANY,
			SITE_VISIT_CREATE_ANY, SITE_VISIT_UPDATE_ANY, SITE_VISIT_DELETE_ANY, SITE_VISIT_ASSIGN_ANY,
			SITE_VISIT_UPDATE_STATUS_ANY, SITE_VISIT_SUBMIT_REPORT_ANY);
	/** Added to the user role later by V202610271310. */
	private static final Set<String> USER_BUILDER_TEAM_PERMISSIONS = Set.of(BUILDER_TEAM_LIST, BUILDER_TEAM_VIEW,
			BUILDER_TEAM_CREATE, BUILDER_TEAM_UPDATE, BUILDER_TEAM_DELETE, BUILDER_TEAM_ASSIGN_ROLE,
			BUILDER_TEAM_MANAGE_PERMISSIONS, BUILDER_TEAM_MANAGE_STATUS, BUILDER_TEAM_MEMBERSHIP_VIEW,
			BUILDER_TEAM_MEMBERSHIP_RESPOND);
	/** Added to the admin role later by V202610271310. */
	private static final Set<String> ADMIN_BUILDER_TEAM_PERMISSIONS = Set.of(BUILDER_TEAM_LIST_ANY,
			BUILDER_TEAM_VIEW_ANY, BUILDER_TEAM_CREATE_ANY, BUILDER_TEAM_UPDATE_ANY, BUILDER_TEAM_DELETE_ANY,
			BUILDER_TEAM_ASSIGN_ROLE, BUILDER_TEAM_MANAGE_PERMISSIONS, BUILDER_TEAM_MANAGE_STATUS);
	/** Added to the user and admin roles later by V202610291010. */
	private static final Set<String> USER_SETTING_PERMISSIONS = Set.of(USER_SETTING_VIEW, USER_SETTING_CREATE,
			USER_SETTING_UPDATE);
	private static final Set<String> ADMIN_PERMISSIONS = Set.of(ADMIN_PANEL_ACCESS, SUBSCRIPTION_PLAN_VIEW,
			SUBSCRIPTION_PLAN_CREATE, SUBSCRIPTION_PLAN_UPDATE, ROLE_VIEW, ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE,
			LEAD_LIST_ANY, LEAD_VIEW_ANY, LEAD_UPDATE_ANY, LEAD_DELETE_ANY);

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void userRoleGrantsExactlyItsOwnLeadPermissions() {
		Role user = roleRepository.findBySlug("user").orElseThrow();

		assertThat(user.getName()).isEqualTo("User");
		assertThat(user.getStatus()).isEqualTo(RoleStatus.ACTIVE);
		assertThat(user.getPermissions()).containsEntry("lead",
				Map.of("list", true, "view", true, "create", true, "update", true, "delete", true));
		Set<String> afterAllMigrations = new HashSet<>(USER_PERMISSIONS);
		afterAllMigrations.addAll(USER_PROPERTY_PERMISSIONS);
		afterAllMigrations.addAll(LEAD_CHILD_PERMISSIONS);
		afterAllMigrations.addAll(USER_SITE_VISIT_PERMISSIONS);
		afterAllMigrations.addAll(USER_BUILDER_TEAM_PERMISSIONS);
		afterAllMigrations.addAll(USER_SETTING_PERMISSIONS);
		assertThat(user.grantedPermissions()).containsExactlyInAnyOrderElementsOf(afterAllMigrations);
		assertThat(user.isGranted("lead", "view_any")).isFalse();
		assertThat(user.isGranted("admin_panel", "access")).isFalse();
		assertThat(user.isGranted("subscription_plan", "view")).isFalse();
	}

	@Test
	void adminRoleGrantsEveryExistingAdministrativePermission() {
		Role admin = roleRepository.findBySlug("admin").orElseThrow();
		// V202610251400 later derives the split plan permissions from view and update; V202610251500 adds
		// properties, V202610251710 banners, V202610251900 blog categories, V202610252000 blogs,
		// V202610261100 FAQs, V202610261300 pages, V202610261430 lead create/assign, schedules and interactions
		// V202610271110 site visits, V202610271310 builder teams and V202610291010 user settings.
		Set<String> afterAllMigrations = new HashSet<>(ADMIN_PERMISSIONS);
		afterAllMigrations.addAll(Set.of(SUBSCRIPTION_PLAN_LIST, SUBSCRIPTION_PLAN_CHANGE_STATUS));
		afterAllMigrations.addAll(ADMIN_PROPERTY_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_BANNER_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_BLOG_CATEGORY_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_BLOG_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_FAQ_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_PAGE_PERMISSIONS);
		afterAllMigrations.addAll(LEAD_CHILD_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_LEAD_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_SITE_VISIT_PERMISSIONS);
		afterAllMigrations.addAll(ADMIN_BUILDER_TEAM_PERMISSIONS);
		afterAllMigrations.addAll(USER_SETTING_PERMISSIONS);

		assertThat(admin.getName()).isEqualTo("Admin");
		assertThat(admin.getStatus()).isEqualTo(RoleStatus.ACTIVE);
		assertThat(admin.grantedPermissions()).containsExactlyInAnyOrderElementsOf(afterAllMigrations);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM roles WHERE slug IN ('user', 'admin') AND deleted_at IS NULL",
				Integer.class)).isEqualTo(2);
	}

	@Test
	void rerunningChangesNothing() {
		// Back to this migration's own result first: newer migrations also change these roles.
		jdbc.execute(script(MIGRATION));
		List<Map<String, Object>> before = snapshot();

		jdbc.execute(script(MIGRATION));
		jdbc.execute(script(MIGRATION));

		assertThat(snapshot()).isEqualTo(before);
	}

	@Test
	void replacesCustomizedRolesAndLeavesEverythingElseAlone() {
		Long userId = jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, user_type) VALUES ('keep@example.com', 'h', 'K', 'admin')
				RETURNING id""", Long.class);
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Ops', 'ops', '{\"lead\": {\"list_any\": true}}')");
		jdbc.update("UPDATE roles SET name = 'Staff', status = 'inactive', deleted_at = now(), "
				+ "permissions = '{\"stale\": {\"export\": true}}' WHERE slug = 'admin'");
		jdbc.update("UPDATE roles SET permissions = '{\"admin_panel\": {\"access\": true}}' WHERE slug = 'user'");
		List<Long> ids = jdbc.queryForList("SELECT id FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug", Long.class);
		Map<String, Object> superAdmin = row("super-admin");
		Map<String, Object> ops = row("ops");

		jdbc.execute(script(MIGRATION));
		entityManager.clear();

		Role admin = roleRepository.findBySlug("admin").orElseThrow();
		assertThat(admin.getName()).isEqualTo("Admin");
		assertThat(admin.grantedPermissions()).containsExactlyInAnyOrderElementsOf(ADMIN_PERMISSIONS);
		assertThat(admin.getPermissions()).doesNotContainKey("stale");
		assertThat(roleRepository.findBySlug("user").orElseThrow().grantedPermissions())
			.containsExactlyInAnyOrderElementsOf(USER_PERMISSIONS);
		assertThat(jdbc.queryForList("SELECT id FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug", Long.class))
			.isEqualTo(ids);
		assertThat(row("super-admin")).isEqualTo(superAdmin);
		assertThat(row("ops")).isEqualTo(ops);
		assertThat(jdbc.queryForObject("SELECT user_type FROM users WHERE id = ?", String.class, userId))
			.isEqualTo("admin");
	}

	private List<Map<String, Object>> snapshot() {
		return jdbc.queryForList("""
				SELECT id, name, slug, permissions::text AS permissions, status, created_at, updated_at, deleted_at
				FROM roles ORDER BY id""");
	}

	private Map<String, Object> row(String slug) {
		return jdbc.queryForMap("""
				SELECT id, name, permissions::text AS permissions, status, updated_at, deleted_at
				FROM roles WHERE slug = ?""", slug);
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
