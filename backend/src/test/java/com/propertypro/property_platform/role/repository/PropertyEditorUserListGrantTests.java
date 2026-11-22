package com.propertypro.property_platform.role.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/** V202611221200: USER_LIST for dashboard roles that create or edit properties. Each test is rolled back. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PropertyEditorUserListGrantTests {

	private static final String MIGRATION = "db/migration/V202611221200__grant_user_list_to_property_editors.sql";
	private static final String ROLLBACK = "db/rollback/U202611221200__grant_user_list_to_property_editors.sql";

	@Autowired
	private JdbcTemplate jdbc;

	private void role(String slug, String permissions) {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug, permissions);
	}

	private String userModule(String slug) {
		return jdbc.queryForObject("SELECT permissions -> 'user' FROM roles WHERE slug = ?", String.class, slug);
	}

	@Test
	void grantsListOnlyToDashboardRolesThatCreateOrEditProperties() {
		role("property-editor", """
				{"admin_panel": {"access": true}, "property": {"update_any": true}}""");
		role("property-creator", """
				{"admin_panel": {"access": true}, "property": {"create": true}, "user": {"view": true}}""");
		role("app-lister", """
				{"admin_panel": {"access": false}, "property": {"create": true}}""");
		role("content-editor", """
				{"admin_panel": {"access": true}, "faq": {"create": true}}""");
		String userRoleBefore = userModule("user");

		jdbc.execute(script(MIGRATION));

		assertThat(userModule("property-editor")).isEqualTo("{\"list\": true}");
		// Merged into the existing user permissions.
		assertThat(userModule("property-creator")).isEqualTo("{\"list\": true, \"view\": true}");
		assertThat(userModule("app-lister")).isNull();
		assertThat(userModule("content-editor")).isNull();
		// The app's user role lists properties from the mobile app but has no dashboard access.
		assertThat(userModule("user")).isEqualTo(userRoleBefore);
	}

	@Test
	void rerunningChangesNothing() {
		role("property-editor", """
				{"admin_panel": {"access": true}, "property": {"create": true}}""");
		jdbc.execute(script(MIGRATION));
		String before = jdbc.queryForObject("SELECT jsonb_agg(permissions ORDER BY id)::text FROM roles", String.class);

		jdbc.execute(script(MIGRATION));

		assertThat(jdbc.queryForObject("SELECT jsonb_agg(permissions ORDER BY id)::text FROM roles", String.class))
			.isEqualTo(before);
	}

	@Test
	void rollbackRemovesOnlyWhatTheMigrationAdded() {
		role("property-editor", """
				{"admin_panel": {"access": true}, "property": {"update_any": true}}""");
		role("property-creator", """
				{"admin_panel": {"access": true}, "property": {"create": true}, "user": {"view": true}}""");
		jdbc.execute(script(MIGRATION));
		String adminUser = userModule("admin");

		jdbc.execute(script(ROLLBACK));

		assertThat(userModule("property-editor")).isNull();
		// Holds more than the granted list permission, so it is left alone.
		assertThat(userModule("property-creator")).isEqualTo("{\"list\": true, \"view\": true}");
		assertThat(userModule("admin")).isEqualTo(adminUser);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202611221200'",
				Integer.class)).isZero();
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
