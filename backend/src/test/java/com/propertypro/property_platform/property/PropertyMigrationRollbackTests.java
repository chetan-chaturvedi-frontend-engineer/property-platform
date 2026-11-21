package com.propertypro.property_platform.property;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs the manual rollback scripts and then the migrations again. PostgreSQL DDL is transactional,
 * so the test transaction's rollback restores the schema and Flyway history afterwards.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PropertyMigrationRollbackTests {

	// Dependency order; rollbacks run in reverse.
	private static final List<String> MIGRATIONS = List.of(
			"202610251000__create_property_projects",
			"202610251010__create_property_apartments",
			"202610251020__create_property_media_tables",
			"202610251030__create_property_amenities",
			"202610251040__create_property_amenity_links",
			"202610251050__create_property_project_nearby_places",
			"202610251500__property_wizard_workflow");

	private static final List<String> TABLES = List.of("property_projects", "property_apartments",
			"property_project_media", "property_apartment_media", "property_amenities", "property_project_amenities",
			"property_apartment_amenities", "property_project_nearby_places", "property_project_status_changes");

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void rollbackRemovesOnlyPropertyTablesAndMigrationsReapply() {
		Long userId = jdbc.queryForObject(
				"INSERT INTO users (email, password_hash, full_name) VALUES ('keep@example.com', 'hash', 'Keep') RETURNING id",
				Long.class);
		insertProject(userId, "before-rollback");

		// site_visits references property_projects, so it goes first.
		jdbc.execute(script("db/rollback/U202610271000__create_site_visits.sql"));
		// saved_properties, property_views and conversations reference property_projects as well.
		jdbc.execute(script("db/rollback/U202611211200__create_saved_properties.sql"));
		jdbc.execute(script("db/rollback/U202611211210__create_property_views.sql"));
		jdbc.execute(script("db/rollback/U202611221000__create_conversations_and_messages.sql"));
		List<String> newestFirst = new ArrayList<>(MIGRATIONS);
		Collections.reverse(newestFirst);
		for (String migration : newestFirst) {
			jdbc.execute(script("db/rollback/U" + migration + ".sql"));
		}

		assertThat(TABLES).allSatisfy(table -> assertThat(exists(table)).as(table).isFalse());
		String[] versions = MIGRATIONS.stream().map(migration -> migration.substring(0, migration.indexOf("__")))
				.toArray(String[]::new);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = ANY (?)",
				Integer.class, (Object) versions)).isZero();
		// Pre-existing tables and data are untouched.
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ?", Integer.class, userId)).isEqualTo(1);
		assertThat(List.of("users", "otp_challenges", "auth_sessions", "refresh_tokens"))
				.allSatisfy(table -> assertThat(exists(table)).as(table).isTrue());

		for (String migration : MIGRATIONS) {
			jdbc.execute(script("db/migration/V" + migration + ".sql"));
		}

		assertThat(TABLES).allSatisfy(table -> assertThat(exists(table)).as(table).isTrue());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM property_amenities", Integer.class)).isEqualTo(12);
		insertProject(userId, "after-reapply");
	}

	@Test
	void rollingBackOutOfOrderFailsInsteadOfDroppingDependents() {
		assertThatThrownBy(() -> jdbc.execute(script("db/rollback/U" + MIGRATIONS.get(0) + ".sql")))
				.isInstanceOf(DataAccessException.class)
				.hasMessageContaining("depend");
	}

	private void insertProject(Long userId, String slug) {
		jdbc.update("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
				    project_email, project_phone, project_address, city, locality, pincode, state)
				VALUES (?, ?, 'villa', 'Test', 'Builder', 'a@example.com', '+919876543210', 'Address', 'Pune',
				    'Baner', '411045', 'Maharashtra')""", userId, slug);
	}

	private boolean exists(String table) {
		return Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table));
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
