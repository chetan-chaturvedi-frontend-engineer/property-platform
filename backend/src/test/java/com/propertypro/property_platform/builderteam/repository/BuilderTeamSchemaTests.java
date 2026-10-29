package com.propertypro.property_platform.builderteam.repository;

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
class BuilderTeamSchemaTests {

	@Autowired
	private JdbcTemplate jdbc;

	private Long builderId;

	private Long employeeId;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM builder_teams");
		builderId = user("builder-team@example.com");
		employeeId = user("employee-team@example.com");
	}

	@Test
	void defaults() {
		Long id = insertMember(employeeId);

		assertThat(jdbc.queryForMap("SELECT status, permissions::text, joined_at, notes FROM builder_teams WHERE id = ?", id))
			.containsEntry("status", "pending")
			.containsEntry("permissions", "{}")
			.containsEntry("joined_at", null)
			.containsEntry("notes", null);
	}

	@Test
	void storesAnAcceptedMembershipWithPermissions() {
		Long id = insertMember(employeeId);

		jdbc.update("""
				UPDATE builder_teams SET status = 'active', joined_at = now(), role = 'sales-executive',
				    permissions = '{"lead": {"list": true, "view": true}, "site_visit": {"assign": false}}'
				WHERE id = ?""", id);

		assertThat(jdbc.queryForObject("SELECT permissions -> 'lead' ->> 'view' FROM builder_teams WHERE id = ?",
				String.class, id)).isEqualTo("true");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"status = 'accepted'",
			"status = 'active'",
			"joined_at = now()",
			"role = 'Sales Executive'",
			"role = 'sales_executive'",
			"role = NULL",
			"permissions = '[]'",
			"permissions = '{\"lead\": true}'",
			"permissions = '{\"lead\": {\"view\": \"yes\"}}'",
			"permissions = '{\"Lead\": {\"view\": true}}'",
			"permissions = NULL",
			"employee_id = builder_id",
			"builder_id = -1",
			"employee_id = -1",
			"user_id = -1"
	})
	void rejectsInvalidRows(String assignment) {
		Long id = insertMember(employeeId);

		assertThatThrownBy(() -> jdbc.update("UPDATE builder_teams SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rejectedMembershipsHaveNoJoinDate() {
		Long id = insertMember(employeeId);

		assertThatThrownBy(() -> jdbc.update(
				"UPDATE builder_teams SET status = 'rejected', joined_at = now() WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void oneOpenMembershipPerBuilderAndEmployee() {
		insertMember(employeeId);

		assertThatThrownBy(() -> insertMember(employeeId)).isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "status = 'rejected'", "status = 'revoked'", "deleted_at = now()" })
	void closedOrDeletedMembershipsAllowANewInvitation(String assignment) {
		Long first = insertMember(employeeId);
		jdbc.update("UPDATE builder_teams SET " + assignment + " WHERE id = ?", first);

		insertMember(employeeId);

		assertThat(jdbc.queryForObject("SELECT count(*) FROM builder_teams WHERE employee_id = ?", Integer.class,
				employeeId)).isEqualTo(2);
	}

	@Test
	void anEmployeeMayJoinSeveralBuilders() {
		Long otherBuilderId = user("other-builder-team@example.com");
		insertMember(employeeId);

		jdbc.update("INSERT INTO builder_teams (user_id, builder_id, employee_id, role) VALUES (?, ?, ?, 'manager')",
				otherBuilderId, otherBuilderId, employeeId);

		assertThat(jdbc.queryForObject("SELECT count(*) FROM builder_teams WHERE employee_id = ?", Integer.class,
				employeeId)).isEqualTo(2);
	}

	// A failed statement aborts the test transaction, so each blocked delete gets its own test.
	@ParameterizedTest
	@ValueSource(strings = { "builder", "employee" })
	void historyBlocksHardDeleteOfUsers(String party) {
		insertMember(employeeId);

		assertThatThrownBy(() -> jdbc.update("DELETE FROM users WHERE id = ?",
				party.equals("builder") ? builderId : employeeId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void createsTheIndexes() {
		assertThat(jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = 'builder_teams'", String.class))
			.containsExactlyInAnyOrder("builder_teams_pkey", "uq_builder_teams_open_membership",
					"idx_builder_teams_builder_id_status", "idx_builder_teams_employee_id_status",
					"idx_builder_teams_user_id", "idx_builder_teams_status_created_at");
	}

	@Test
	void rollbackDropsOnlyBuilderTeamsAndMigrationReapplies() {
		insertMember(employeeId);
		int users = jdbc.queryForObject("SELECT count(*) FROM users", Integer.class);

		jdbc.execute(script("db/rollback/U202610271200__create_builder_teams.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('builder_teams') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271200'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(users);

		jdbc.execute(script("db/migration/V202610271200__create_builder_teams.sql"));

		assertThat(insertMember(employeeId)).isNotNull();
	}

	@Test
	void teamMemberLimitsDefaultToNotIncludedAndRollBackCleanly() {
		Long planId = jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price) VALUES ('Team', 'team-limit-schema', 10)
				RETURNING id""", Long.class);
		assertThat(jdbc.queryForObject("SELECT no_of_team_members FROM subscription_plans WHERE id = ?", Integer.class,
				planId)).isZero();
		assertThatThrownBy(() -> jdbc.update("UPDATE subscription_plans SET no_of_team_members = -1 WHERE id = ?", planId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void teamMemberLimitRollbackDropsOnlyTheColumnsAndReapplies() {
		jdbc.execute(script("db/rollback/U202610271300__add_team_member_limits.sql"));

		assertThat(jdbc.queryForObject("""
				SELECT count(*) FROM information_schema.columns
				WHERE column_name = 'no_of_team_members' AND table_name IN ('subscription_plans', 'user_subscriptions')""",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271300'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT to_regclass('user_subscriptions') IS NOT NULL", Boolean.class)).isTrue();

		jdbc.execute(script("db/migration/V202610271300__add_team_member_limits.sql"));
		assertThat(jdbc.queryForObject("""
				SELECT count(*) FROM information_schema.columns
				WHERE column_name = 'no_of_team_members' AND table_name IN ('subscription_plans', 'user_subscriptions')""",
				Integer.class)).isEqualTo(2);
	}

	@Test
	void permissionGrantRollbackRemovesOnlyBuilderTeamKeysAndReapplies() {
		String granted = "SELECT slug, permissions::text FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug";
		String others = "SELECT (permissions - 'builder_team' - 'builder_team_membership')::text FROM roles "
				+ "WHERE slug IN ('user', 'admin') ORDER BY slug";
		List<Map<String, Object>> before = jdbc.queryForList(granted);
		List<String> otherModules = jdbc.queryForList(others, String.class);

		jdbc.execute(script("db/rollback/U202610271310__grant_builder_team_permissions.sql"));

		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'builder_team' "
				+ "OR permissions ? 'builder_team_membership'", String.class)).isEmpty();
		assertThat(jdbc.queryForList(others, String.class)).isEqualTo(otherModules);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610271310'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610271310__grant_builder_team_permissions.sql"));
		assertThat(jdbc.queryForList(granted)).isEqualTo(before);
	}

	private Long insertMember(Long employee) {
		return jdbc.queryForObject("""
				INSERT INTO builder_teams (user_id, builder_id, employee_id, role)
				VALUES (?, ?, ?, 'manager')
				RETURNING id""", Long.class, builderId, builderId, employee);
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
