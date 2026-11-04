package com.propertypro.property_platform.activitylog;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SystemLogSchemaTests {

	@Autowired
	private JdbcTemplate jdbc;

	private Long userId;
	private Long logId;

	@BeforeEach
	void insertLog() {
		userId = jdbc.queryForObject("""
				INSERT INTO users (email, phone, password_hash, full_name)
				VALUES ('system-log-schema@example.com', '+919800000123', 'hash', 'Log Schema') RETURNING id""", Long.class);
		logId = jdbc.queryForObject("""
				INSERT INTO system_logs (user_id, module, action, log_level, ip_address, additional_data)
				VALUES (?, 'faqs', 'FAQ updated', 'success', '2001:db8::1', '{"a": 1}') RETURNING id""", Long.class, userId);
	}

	@Test
	void updatesAreRejected() {
		assertThatThrownBy(() -> jdbc.update("UPDATE system_logs SET action = 'changed' WHERE id = ?", logId))
			.isInstanceOf(DataAccessException.class)
			.hasMessageContaining("append-only");
	}

	@Test
	void clearingTheUserDirectlyIsRejected() {
		assertThatThrownBy(() -> jdbc.update("UPDATE system_logs SET user_id = NULL WHERE id = ?", logId))
			.hasMessageContaining("append-only");
	}

	@Test
	void deletesAreRejected() {
		assertThatThrownBy(() -> jdbc.update("DELETE FROM system_logs WHERE id = ?", logId))
			.hasMessageContaining("append-only");
	}

	@Test
	void truncateIsRejected() {
		jdbc.execute("ALTER TABLE system_logs ENABLE TRIGGER trg_system_logs_no_truncate");

		assertThatThrownBy(() -> jdbc.execute("TRUNCATE system_logs"))
			.hasMessageContaining("append-only");
	}

	@Test
	void deletingAUserClearsOnlyTheLink() {
		jdbc.update("DELETE FROM users WHERE id = ?", userId);

		assertThat(jdbc.queryForMap("SELECT user_id, action FROM system_logs WHERE id = ?", logId))
			.containsEntry("user_id", null)
			.containsEntry("action", "FAQ updated");
	}

	@Test
	void guestAndSystemLogsHaveNoUser() {
		insert("NULL", "info", "NULL", "NULL", "NULL");

		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs WHERE user_id IS NULL AND module = 'test'",
				Long.class)).isOne();
	}

	@ParameterizedTest
	@ValueSource(strings = { "error", "INFO", "" })
	void rejectsOtherLogLevels(String level) {
		assertThatThrownBy(() -> insert("NULL", level, "NULL", "NULL", "NULL"))
			.hasMessageContaining("chk_system_logs_log_level");
	}

	@Test
	void rejectsOtherRequestMethods() {
		assertThatThrownBy(() -> insert("'HEAD'", "info", "NULL", "NULL", "NULL"))
			.hasMessageContaining("chk_system_logs_request_method");
	}

	@Test
	void aReferenceIdNeedsItsType() {
		assertThatThrownBy(() -> insert("NULL", "info", "5", "NULL", "NULL"))
			.hasMessageContaining("chk_system_logs_reference");
	}

	@Test
	void additionalDataMustBeAnObject() {
		assertThatThrownBy(() -> insert("NULL", "info", "NULL", "NULL", "'[1]'"))
			.hasMessageContaining("chk_system_logs_additional_data");
	}

	private void insert(String method, String level, String referenceId, String referenceType, String data) {
		jdbc.update("INSERT INTO system_logs (module, action, log_level, request_method, reference_id, reference_type,"
				+ " additional_data) VALUES ('test', 'Test', '" + level + "', " + method + ", " + referenceId + ", "
				+ referenceType + ", " + data + ")");
	}

}
