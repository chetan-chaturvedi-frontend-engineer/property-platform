package com.propertypro.property_platform.user.repository;

import com.propertypro.property_platform.user.domain.UserSettings;
import com.propertypro.property_platform.user.domain.UserTheme;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class UserSettingsSchemaTests {

	@Autowired
	private UserSettingsRepository repository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	private Long userId;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM user_settings");
		userId = user("settings-schema@example.com");
	}

	@Test
	void columnDefaultsMatchTheEntityDefaults() {
		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);

		assertThat(jdbc.queryForMap("""
				SELECT location, theme, language, notification_enabled, email_notifications, push_notifications,
				       sms_notifications, timezone, created_at IS NOT NULL AS created, updated_at IS NOT NULL AS updated
				FROM user_settings WHERE user_id = ?""", userId))
			.containsEntry("location", null)
			.containsEntry("theme", "system")
			.containsEntry("language", "en")
			.containsEntry("notification_enabled", true)
			.containsEntry("email_notifications", true)
			.containsEntry("push_notifications", true)
			.containsEntry("sms_notifications", false)
			.containsEntry("timezone", "UTC")
			.containsEntry("created", true)
			.containsEntry("updated", true);

		UserSettings defaults = new UserSettings(userId);
		assertThat(defaults.getTheme()).isEqualTo(UserTheme.SYSTEM);
		assertThat(defaults.getLanguage()).isEqualTo("en");
		assertThat(defaults.getTimezone()).isEqualTo("UTC");
		assertThat(defaults.isNotificationEnabled()).isTrue();
		assertThat(defaults.isEmailNotifications()).isTrue();
		assertThat(defaults.isPushNotifications()).isTrue();
		assertThat(defaults.isSmsNotifications()).isFalse();
		assertThat(defaults.getLocation()).isNull();
	}

	@Test
	void entityStoresLowercaseThemeAndRefreshesUpdatedAt() {
		UserSettings settings = repository.saveAndFlush(new UserSettings(userId));
		jdbc.update("UPDATE user_settings SET updated_at = now() - interval '1 day' WHERE id = ?", settings.getId());
		entityManager.clear();

		UserSettings loaded = repository.findByUserId(userId).orElseThrow();
		Instant before = loaded.getUpdatedAt();
		loaded.setTheme(UserTheme.DARK);
		loaded.setLanguage("en-US");
		loaded.setTimezone("Asia/Kolkata");
		repository.saveAndFlush(loaded);

		assertThat(jdbc.queryForMap("SELECT theme, language, timezone FROM user_settings WHERE user_id = ?", userId))
			.containsEntry("theme", "dark")
			.containsEntry("language", "en-US")
			.containsEntry("timezone", "Asia/Kolkata");
		assertThat(loaded.getUpdatedAt()).isAfter(before);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"theme = 'blue'",
			"theme = 'Dark'",
			"theme = NULL",
			"language = 'english'",
			"language = 'EN'",
			"language = 'en_US'",
			"language = 'en-us'",
			"language = NULL",
			"timezone = ''",
			"timezone = 'Asia/Kolkata; DROP'",
			"timezone = NULL",
			"location = '   '",
			"notification_enabled = NULL",
			"email_notifications = NULL",
			"push_notifications = NULL",
			"sms_notifications = NULL",
			"user_id = -1"
	})
	void rejectsInvalidRows(String assignment) {
		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);

		assertThatThrownBy(() -> jdbc.update("UPDATE user_settings SET " + assignment + " WHERE user_id = ?", userId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "en", "hi", "en-US", "es-419", "fil" })
	void acceptsLanguageCodes(String language) {
		jdbc.update("INSERT INTO user_settings (user_id, language) VALUES (?, ?)", userId, language);

		assertThat(jdbc.queryForObject("SELECT language FROM user_settings WHERE user_id = ?", String.class, userId))
			.isEqualTo(language);
	}

	@Test
	void oneSettingsRowPerUser() {
		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);

		assertThatThrownBy(() -> jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void hardDeletingTheUserDeletesTheSettings() {
		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);

		jdbc.update("DELETE FROM users WHERE id = ?", userId);

		assertThat(jdbc.queryForObject("SELECT count(*) FROM user_settings WHERE user_id = ?", Integer.class, userId))
			.isZero();
	}

	@Test
	void createsTheIndexes() {
		assertThat(jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = 'user_settings'", String.class))
			.containsExactlyInAnyOrder("user_settings_pkey", "uq_user_settings_user_id");
	}

	@Test
	void rollbackDropsOnlyUserSettingsAndMigrationReapplies() {
		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);
		int users = jdbc.queryForObject("SELECT count(*) FROM users", Integer.class);

		jdbc.execute(script("db/rollback/U202610291000__create_user_settings.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('user_settings') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610291000'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(users);

		jdbc.execute(script("db/migration/V202610291000__create_user_settings.sql"));

		jdbc.update("INSERT INTO user_settings (user_id) VALUES (?)", userId);
	}

	@Test
	void permissionGrantRollbackRemovesOnlyUserSettingKeysAndReapplies() {
		String granted = "SELECT slug, permissions::text FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug";
		String others = "SELECT (permissions - 'user_setting')::text FROM roles WHERE slug IN ('user', 'admin') ORDER BY slug";
		List<Map<String, Object>> before = jdbc.queryForList(granted);
		List<String> otherModules = jdbc.queryForList(others, String.class);

		jdbc.execute(script("db/rollback/U202610291010__grant_user_setting_permissions.sql"));

		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'user_setting'", String.class)).isEmpty();
		assertThat(jdbc.queryForList(others, String.class)).isEqualTo(otherModules);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610291010'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610291010__grant_user_setting_permissions.sql"));
		assertThat(jdbc.queryForList(granted)).isEqualTo(before);
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
