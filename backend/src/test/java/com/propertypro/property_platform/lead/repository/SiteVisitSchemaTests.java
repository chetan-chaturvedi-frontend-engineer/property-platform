package com.propertypro.property_platform.lead.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SiteVisitSchemaTests {

	private static final String MOBILE = "+919876543210";

	@Autowired
	private JdbcTemplate jdbc;

	private Long builderId;

	private Long agentId;

	private Long propertyId;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM site_visits");
		builderId = user("builder-site-visit@example.com");
		agentId = user("agent-site-visit@example.com");
		propertyId = jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
				    project_email, project_phone)
				VALUES (?, 'site-visit-schema', 'villa', 'Test', 'Builder', 'a@example.com', '+919876543210')
				RETURNING id""", Long.class, builderId);
	}

	@Test
	void defaultsAndGeneratedVisitCode() {
		Long first = insertVisit();
		Long second = insertVisit();

		assertThat(jdbc.queryForMap("SELECT visit_type, status, number_of_people, user_id, assign_id, interest "
				+ "FROM site_visits WHERE id = ?", first))
			.containsEntry("visit_type", "site_visit")
			.containsEntry("status", "scheduled")
			.containsEntry("number_of_people", 1)
			.containsEntry("user_id", null)
			.containsEntry("assign_id", null)
			.containsEntry("interest", null);
		String firstCode = code(first);
		assertThat(firstCode).matches("SV-[0-9]{6,}");
		assertThat(code(second)).isNotEqualTo(firstCode);
	}

	@Test
	void mobileAndEmailAreNotUnique() {
		insertVisit();
		insertVisit();

		assertThat(jdbc.queryForObject("SELECT count(*) FROM site_visits WHERE mobile = ?", Integer.class, MOBILE))
			.isEqualTo(2);
	}

	@Test
	void storesACompletedVisitReport() {
		Long id = insertVisit();

		jdbc.update("""
				UPDATE site_visits SET status = 'completed', actual_visit_date = now(), duration = 45,
				    interest = 'high', rating = 5, visit_note = 'Liked the clubhouse', report_submitted_by = ?,
				    next_follow_up = now() + interval '2 days', follow_up_note = 'Share price sheet'
				WHERE id = ?""", agentId, id);

		assertThat(jdbc.queryForObject("SELECT interest FROM site_visits WHERE id = ?", String.class, id))
			.isEqualTo("high");
	}

	@Test
	void cancellingRecordsWhenAndWhy() {
		Long id = insertVisit();

		jdbc.update("UPDATE site_visits SET status = 'cancelled', cancelled_at = now(), "
				+ "cancellation_reason = 'Travelling' WHERE id = ?", id);

		assertThat(jdbc.queryForObject("SELECT status FROM site_visits WHERE id = ?", String.class, id))
			.isEqualTo("cancelled");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"visit_code = 'ABC'",
			"visit_type = 'drive_by'",
			"status = 'pending'",
			"interest = 'maybe'",
			"name = '  '",
			"mobile = '9876543210'",
			"mobile = NULL",
			"visit_date = NULL",
			"visit_time = NULL",
			"number_of_people = 0",
			"duration = 0",
			"duration = -5",
			"rating = 0",
			"rating = 6",
			"status = 'completed'",
			"actual_visit_date = now()",
			"status = 'cancelled'",
			"cancelled_at = now()",
			"cancellation_reason = 'Busy'",
			"builder_id = -1",
			"property_id = -1",
			"user_id = -1",
			"lead_id = -1",
			"assign_id = -1",
			"scheduled_by = -1",
			"report_submitted_by = -1"
	})
	void rejectsInvalidRows(String assignment) {
		Long id = insertVisit();

		assertThatThrownBy(() -> jdbc.update("UPDATE site_visits SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void visitCodeIsUnique() {
		Long first = insertVisit();
		Long second = insertVisit();

		assertThatThrownBy(() -> jdbc.update("UPDATE site_visits SET visit_code = ? WHERE id = ?", code(first),
				second))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void purgingTheAssigneeUnassignsTheVisit() {
		Long id = insertVisit();
		jdbc.update("UPDATE site_visits SET assign_id = ?, assigned_at = now() WHERE id = ?", agentId, id);

		jdbc.update("DELETE FROM users WHERE id = ?", agentId);

		assertThat(jdbc.queryForObject("SELECT assign_id FROM site_visits WHERE id = ?", Long.class, id)).isNull();
	}

	// A failed statement aborts the test transaction, so each blocked delete gets its own test.
	@ParameterizedTest
	@ValueSource(strings = { "property_projects", "users" })
	void historyBlocksHardDeleteOfThePropertyAndBuilder(String table) {
		insertVisit();
		Long parentId = table.equals("users") ? builderId : propertyId;

		assertThatThrownBy(() -> jdbc.update("DELETE FROM " + table + " WHERE id = ?", parentId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void createsTheIndexes() {
		assertThat(jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = 'site_visits'", String.class))
			.containsExactlyInAnyOrder("site_visits_pkey", "uq_site_visits_visit_code",
					"idx_site_visits_builder_id_visit_date", "idx_site_visits_property_id_visit_date",
					"idx_site_visits_user_id_visit_date", "idx_site_visits_assign_id_visit_date",
					"idx_site_visits_lead_id", "idx_site_visits_scheduled_by", "idx_site_visits_report_submitted_by",
					"idx_site_visits_status_visit_date", "idx_site_visits_visit_date",
					"idx_site_visits_next_follow_up", "idx_site_visits_mobile", "uq_site_visits_active_booking");
	}

	@Test
	void aVisitorHasOneUpcomingBookingPerPropertyAndSlot() {
		Long visitorId = user("visitor-site-visit@example.com");
		Long first = insertVisit();
		jdbc.update("UPDATE site_visits SET user_id = ? WHERE id = ?", visitorId, first);
		Long second = insertVisit();

		assertThatThrownBy(() -> jdbc.update("UPDATE site_visits SET user_id = ? WHERE id = ?", visitorId, second))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void aFinishedBookingFreesTheSlot() {
		Long visitorId = user("visitor-site-visit@example.com");
		Long first = insertVisit();
		jdbc.update("UPDATE site_visits SET user_id = ?, status = 'cancelled', cancelled_at = now() WHERE id = ?",
				visitorId, first);
		Long second = insertVisit();

		jdbc.update("UPDATE site_visits SET user_id = ? WHERE id = ?", visitorId, second);

		assertThat(jdbc.queryForObject("SELECT count(*) FROM site_visits WHERE user_id = ?", Integer.class, visitorId))
			.isEqualTo(2);
	}

	@Test
	void duplicateBookingRollbackDropsOnlyTheIndex() {
		insertVisit();

		jdbc.execute(script("db/rollback/U202610271100__prevent_duplicate_site_visit_bookings.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('uq_site_visits_active_booking') IS NULL", Boolean.class))
			.isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM site_visits", Integer.class)).isOne();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271100'",
				Integer.class)).isZero();
		jdbc.execute(script("db/migration/V202610271100__prevent_duplicate_site_visit_bookings.sql"));
	}

	@Test
	void permissionGrantRollbackRemovesOnlySiteVisitKeysAndReapplies() {
		String granted = "SELECT slug, permissions::text FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug";
		String others = "SELECT (permissions - 'site_visit')::text FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug";
		List<Map<String, Object>> before = jdbc.queryForList(granted);
		List<String> otherModules = jdbc.queryForList(others, String.class);

		jdbc.execute(script("db/rollback/U202610271110__grant_site_visit_permissions.sql"));

		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'site_visit'", String.class)).isEmpty();
		assertThat(jdbc.queryForList(others, String.class)).isEqualTo(otherModules);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271110'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610271110__grant_site_visit_permissions.sql"));
		assertThat(jdbc.queryForList(granted)).isEqualTo(before);
	}

	@Test
	void rollbackDropsOnlySiteVisitsAndMigrationReapplies() {
		insertVisit();
		int users = jdbc.queryForObject("SELECT count(*) FROM users", Integer.class);

		jdbc.execute(script("db/rollback/U202610271000__create_site_visits.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('site_visits') IS NULL "
				+ "AND to_regclass('site_visit_code_seq') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271000'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(users);
		assertThat(List.of("property_projects", "leads")).allSatisfy(table -> assertThat(
				jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table)).as(table).isTrue());

		jdbc.execute(script("db/migration/V202610271000__create_site_visits.sql"));

		assertThat(code(insertVisit())).isEqualTo("SV-100001");
	}

	private Long insertVisit() {
		return jdbc.queryForObject("""
				INSERT INTO site_visits (builder_id, property_id, visit_date, visit_time, name, mobile, email)
				VALUES (?, ?, DATE '2026-11-02', TIME '11:30', 'Ravi Kumar', ?, 'ravi@example.com')
				RETURNING id""", Long.class, builderId, propertyId, MOBILE);
	}

	private String code(Long id) {
		return jdbc.queryForObject("SELECT visit_code FROM site_visits WHERE id = ?", String.class, id);
	}

	private Long user(String email) {
		return jdbc.queryForObject("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'x', 'Test') "
				+ "RETURNING id", Long.class, email);
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
