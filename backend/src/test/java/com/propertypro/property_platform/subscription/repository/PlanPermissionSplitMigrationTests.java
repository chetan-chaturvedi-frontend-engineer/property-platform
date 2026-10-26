package com.propertypro.property_platform.subscription.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** V202610251400: subscription_plan.list and change_status derived from view and update. Rolled back per test. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PlanPermissionSplitMigrationTests {

	private static final String MIGRATION = "db/migration/V202610251400__split_subscription_plan_permissions.sql";
	private static final String ROLLBACK = "db/rollback/U202610251400__split_subscription_plan_permissions.sql";

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void seededAdministratorRolesKeepTheirAccess() {
		for (String slug : List.of("super-admin", "admin")) {
			assertThat(planPermissions(slug)).as(slug).isEqualTo("""
					{"list": true, "view": true, "create": true, "update": true, "change_status": true}""");
		}
		assertThat(jdbc.queryForObject("SELECT permissions ? 'subscription_plan' FROM roles WHERE slug = 'user'",
				Boolean.class)).isFalse();
	}

	@Test
	void derivesFromViewAndUpdateAndKeepsExistingKeys() {
		insertRole("viewer", "{\"subscription_plan\": {\"view\": true, \"update\": false}}");
		insertRole("editor", "{\"subscription_plan\": {\"update\": true}}");
		insertRole("custom", "{\"subscription_plan\": {\"view\": true, \"list\": false, \"change_status\": true}}");
		insertRole("other", "{\"lead\": {\"list\": true}}");
		jdbc.update("UPDATE roles SET deleted_at = now() WHERE slug = 'editor'");

		jdbc.execute(script(MIGRATION));

		assertThat(planPermissions("viewer")).isEqualTo("""
				{"list": true, "view": true, "update": false, "change_status": false}""");
		assertThat(planPermissions("editor")).isEqualTo("""
				{"list": false, "update": true, "change_status": true}""");
		assertThat(planPermissions("custom")).isEqualTo("""
				{"list": false, "view": true, "change_status": true}""");
		assertThat(permissions("other")).isEqualTo("{\"lead\": {\"list\": true}}");
	}

	@Test
	void rerunningChangesNothing() {
		List<Map<String, Object>> before = jdbc.queryForList(
				"SELECT id, permissions::text AS permissions, updated_at FROM roles ORDER BY id");

		jdbc.execute(script(MIGRATION));

		assertThat(jdbc.queryForList("SELECT id, permissions::text AS permissions, updated_at FROM roles ORDER BY id"))
			.isEqualTo(before);
	}

	@Test
	void rollbackRemovesOnlyTheSplitKeys() {
		jdbc.execute(script(ROLLBACK));

		assertThat(planPermissions("admin")).isEqualTo("{\"view\": true, \"create\": true, \"update\": true}");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610251400'",
				Integer.class)).isZero();

		jdbc.execute(script(MIGRATION));
		assertThat(planPermissions("admin")).contains("\"list\": true", "\"change_status\": true");
	}

	private void insertRole(String slug, String permissions) {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug, permissions);
	}

	private String planPermissions(String slug) {
		return jdbc.queryForObject("SELECT (permissions -> 'subscription_plan')::text FROM roles WHERE slug = ?",
				String.class, slug);
	}

	private String permissions(String slug) {
		return jdbc.queryForObject("SELECT permissions::text FROM roles WHERE slug = ?", String.class, slug);
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
