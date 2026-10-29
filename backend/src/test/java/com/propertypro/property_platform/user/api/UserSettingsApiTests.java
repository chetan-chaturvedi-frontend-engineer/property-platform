package com.propertypro.property_platform.user.api;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The caller's own settings through real logins and the seeded user and admin roles. */
class UserSettingsApiTests extends AbstractIntegrationTest {

	private static final String SETTINGS = "/api/v1/user-settings";
	private static final String FULL = """
			{"location": "Jaipur", "theme": "dark", "language": "hi", "notificationEnabled": true,
			 "emailNotifications": false, "pushNotifications": true, "smsNotifications": true,
			 "timezone": "Asia/Kolkata"}""";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private long aliceId;
	private long bobId;
	private String alice;
	private String bob;

	@BeforeEach
	void setUpAccounts() throws Exception {
		originalRoles = jdbc.queryForList(
				"SELECT slug, permissions::text AS permissions FROM roles WHERE slug IN ('user', 'admin')");
		aliceId = account("alice@example.com", "user");
		bobId = account("bob@example.com", "user");
		alice = token("/api/v1/auth/login", "alice@example.com");
		bob = token("/api/v1/auth/login", "bob@example.com");
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = ?",
				role.get("permissions"), role.get("slug")));
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(SETTINGS)).andExpect(status().isUnauthorized());
		mvc.perform(post(SETTINGS).contentType(MediaType.APPLICATION_JSON).content(FULL))
			.andExpect(status().isUnauthorized());
		mvc.perform(patch(SETTINGS).contentType(MediaType.APPLICATION_JSON).content("{\"theme\": \"dark\"}"))
			.andExpect(status().isUnauthorized());
		getWithToken(SETTINGS, "not-a-token").andExpect(status().isUnauthorized());
		send(patch(SETTINGS), "not-a-token", "{\"theme\": \"dark\"}").andExpect(status().isUnauthorized());
		assertThat(rows()).isZero();
	}

	@Test
	void createsTheCallersSettings() throws Exception {
		long id = Long.parseLong(json(send(post(SETTINGS), alice, FULL)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").isNumber())
			.andExpect(jsonPath("$.location").value("Jaipur"))
			.andExpect(jsonPath("$.theme").value("dark"))
			.andExpect(jsonPath("$.language").value("hi"))
			.andExpect(jsonPath("$.notificationEnabled").value(true))
			.andExpect(jsonPath("$.emailNotifications").value(false))
			.andExpect(jsonPath("$.pushNotifications").value(true))
			.andExpect(jsonPath("$.smsNotifications").value(true))
			.andExpect(jsonPath("$.timezone").value("Asia/Kolkata"))
			.andExpect(jsonPath("$.createdAt").isNotEmpty())
			.andExpect(jsonPath("$.updatedAt").isNotEmpty())
			.andReturn().getResponse().getContentAsString(), "$.id"));

		assertThat(jdbc.queryForObject("SELECT user_id FROM user_settings WHERE id = ?", Long.class, id))
			.isEqualTo(aliceId);
		getWithToken(SETTINGS, alice).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
	}

	@Test
	void omittedFieldsTakeTheDefaultsOnCreate() throws Exception {
		send(post(SETTINGS), alice, "{}")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.location").value(nullValue()))
			.andExpect(jsonPath("$.theme").value("system"))
			.andExpect(jsonPath("$.language").value("en"))
			.andExpect(jsonPath("$.notificationEnabled").value(true))
			.andExpect(jsonPath("$.emailNotifications").value(true))
			.andExpect(jsonPath("$.pushNotifications").value(true))
			.andExpect(jsonPath("$.smsNotifications").value(false))
			.andExpect(jsonPath("$.timezone").value("UTC"));
	}

	@Test
	void duplicateSettingsAreRejected() throws Exception {
		send(post(SETTINGS), alice, "{\"theme\": \"dark\"}").andExpect(status().isCreated());

		send(post(SETTINGS), alice, "{\"theme\": \"light\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("user_settings_already_exist"));

		assertThat(rows()).isOne();
		getWithToken(SETTINGS, alice).andExpect(jsonPath("$.theme").value("dark"));
	}

	@Test
	void concurrentCreationsProduceOneRow() throws Exception {
		int threads = 4;
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		try {
			List<Future<Integer>> results = new ArrayList<>();
			for (int i = 0; i < threads; i++) {
				results.add(executor.submit(() -> {
					start.await();
					return send(post(SETTINGS), alice, FULL).andReturn().getResponse().getStatus();
				}));
			}
			start.countDown();

			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> result : results) {
				statuses.add(result.get(30, TimeUnit.SECONDS));
			}
			assertThat(statuses).containsOnlyOnce(201).filteredOn(code -> code != 201).containsOnly(409);
			assertThat(rows()).isOne();
		}
		finally {
			executor.shutdownNow();
		}
	}

	@Test
	void missingSettingsAreNotFound() throws Exception {
		getWithToken(SETTINGS, alice)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("user_settings_not_found"));
		send(patch(SETTINGS), alice, "{\"theme\": \"dark\"}")
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("user_settings_not_found"));
		assertThat(rows()).isZero();
	}

	@Test
	void partialUpdatesChangeOnlyTheFieldsSent() throws Exception {
		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());
		jdbc.update("UPDATE user_settings SET updated_at = now() - interval '1 day' WHERE user_id = ?", aliceId);

		send(patch(SETTINGS), alice, "{\"smsNotifications\": false, \"language\": \"en-US\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.smsNotifications").value(false))
			.andExpect(jsonPath("$.language").value("en-US"))
			.andExpect(jsonPath("$.location").value("Jaipur"))
			.andExpect(jsonPath("$.theme").value("dark"))
			.andExpect(jsonPath("$.notificationEnabled").value(true))
			.andExpect(jsonPath("$.emailNotifications").value(false))
			.andExpect(jsonPath("$.pushNotifications").value(true))
			.andExpect(jsonPath("$.timezone").value("Asia/Kolkata"));

		assertThat(jdbc.queryForObject("SELECT updated_at > now() - interval '1 minute' FROM user_settings "
				+ "WHERE user_id = ?", Boolean.class, aliceId)).isTrue();
	}

	@Test
	void nullClearsTheLocationOnly() throws Exception {
		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());

		send(patch(SETTINGS), alice, "{\"location\": null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.location").value(nullValue()))
			.andExpect(jsonPath("$.theme").value("dark"));
		send(patch(SETTINGS), alice, "{\"location\": \"  Pune  \"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.location").value("Pune"));
	}

	@Test
	void emptyUpdatesAreRejected() throws Exception {
		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());

		send(patch(SETTINGS), alice, "{}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.body").isNotEmpty());
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"{\"theme\": \"blue\"}",
			"{\"theme\": \"DARK\"}",
			"{\"theme\": null}",
			"{\"theme\": 1}",
			"{\"language\": \"english\"}",
			"{\"language\": \"en_US\"}",
			"{\"language\": \"EN\"}",
			"{\"language\": null}",
			"{\"timezone\": \"Mars/Olympus\"}",
			"{\"timezone\": \"+05:30\"}",
			"{\"timezone\": \"asia/kolkata\"}",
			"{\"timezone\": null}",
			"{\"timezone\": 5}",
			"{\"notificationEnabled\": null}",
			"{\"notificationEnabled\": \"true\"}",
			"{\"emailNotifications\": 1}",
			"{\"pushNotifications\": \"yes\"}",
			"{\"smsNotifications\": 0}",
			"{\"smsNotifications\": [true]}",
			"{\"location\": \"   \"}",
			"{\"location\": 123}",
			"{\"location\": {\"city\": \"Pune\"}}",
			"{\"userId\": 2, \"theme\": \"dark\"}",
			"{\"user_id\": 2, \"theme\": \"dark\"}",
			"{\"id\": 1, \"theme\": \"dark\"}",
			"{\"createdAt\": \"2020-01-01T00:00:00Z\", \"theme\": \"dark\"}",
			"{\"updatedAt\": \"2020-01-01T00:00:00Z\", \"theme\": \"dark\"}",
			"{\"theme\": \"dark\"",
			"[]",
			"not json"
	})
	void invalidPayloadsAreRejectedWithoutChanges(String body) throws Exception {
		send(post(SETTINGS), alice, body)
			.andExpect(status().isBadRequest())
			.andExpect(content().string(not(containsString("Exception"))));
		assertThat(rows()).isZero();

		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());
		String before = jdbc.queryForObject("SELECT row_to_json(s)::text FROM user_settings s", String.class);
		send(patch(SETTINGS), alice, body).andExpect(status().isBadRequest());
		assertThat(jdbc.queryForObject("SELECT row_to_json(s)::text FROM user_settings s", String.class))
			.isEqualTo(before);
	}

	@Test
	void tooLongValuesAreRejected() throws Exception {
		send(post(SETTINGS), alice, "{\"location\": \"%s\"}".formatted("x".repeat(151)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.location").isNotEmpty());
		send(post(SETTINGS), alice, "{\"language\": \"en-USAAAAAAA\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.language").isNotEmpty());
		assertThat(rows()).isZero();
	}

	@Test
	void aForgedUserIdCannotCreateOrChangeAnotherUsersSettings() throws Exception {
		send(post(SETTINGS), bob, "{\"theme\": \"light\"}").andExpect(status().isCreated());

		send(post(SETTINGS), alice, "{\"userId\": %d, \"theme\": \"dark\"}".formatted(bobId))
			.andExpect(status().isBadRequest());
		send(patch(SETTINGS), alice, "{\"userId\": %d, \"theme\": \"dark\"}".formatted(bobId))
			.andExpect(status().isBadRequest());
		// Alice has no settings of her own, and nothing in a request can point her at Bob's.
		send(patch(SETTINGS), alice, "{\"theme\": \"dark\"}").andExpect(status().isNotFound());

		assertThat(jdbc.queryForObject("SELECT theme FROM user_settings WHERE user_id = ?", String.class, bobId))
			.isEqualTo("light");
		assertThat(rows()).isOne();
	}

	@Test
	void usersOnlyEverSeeAndChangeTheirOwnSettings() throws Exception {
		send(post(SETTINGS), alice, "{\"theme\": \"dark\", \"location\": \"Jaipur\"}").andExpect(status().isCreated());
		getWithToken(SETTINGS, bob).andExpect(status().isNotFound());

		send(post(SETTINGS), bob, "{\"theme\": \"light\"}").andExpect(status().isCreated());
		send(patch(SETTINGS), bob, "{\"location\": \"Pune\"}").andExpect(status().isOk());

		getWithToken(SETTINGS, alice)
			.andExpect(jsonPath("$.theme").value("dark"))
			.andExpect(jsonPath("$.location").value("Jaipur"));
		getWithToken(SETTINGS, bob)
			.andExpect(jsonPath("$.theme").value("light"))
			.andExpect(jsonPath("$.location").value("Pune"));
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());
		jdbc.update("UPDATE roles SET permissions = permissions - 'user_setting' WHERE slug = 'user'");

		getWithToken(SETTINGS, alice)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("user_settings_action_forbidden"));
		send(patch(SETTINGS), alice, "{\"theme\": \"light\"}").andExpect(status().isForbidden());
		send(post(SETTINGS), bob, FULL).andExpect(status().isForbidden());
		assertThat(rows()).isOne();
	}

	@Test
	void eachActionNeedsItsOwnPermission() throws Exception {
		jdbc.update("""
				UPDATE roles SET permissions = permissions
				    || '{"user_setting": {"view": true, "create": true, "update": false}}'::jsonb
				WHERE slug = 'user'""");

		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());
		getWithToken(SETTINGS, alice).andExpect(status().isOk());
		send(patch(SETTINGS), alice, "{\"theme\": \"light\"}").andExpect(status().isForbidden());
		getWithToken(SETTINGS, alice).andExpect(jsonPath("$.theme").value("dark"));
	}

	@Test
	void adminsHaveTheirOwnSettings() throws Exception {
		account("admin@example.com", "admin");
		String admin = token("/api/v1/admin/login", "admin@example.com");
		send(post(SETTINGS), alice, "{\"theme\": \"dark\"}").andExpect(status().isCreated());

		send(post(SETTINGS), admin, "{\"theme\": \"light\"}").andExpect(status().isCreated());

		getWithToken(SETTINGS, admin).andExpect(jsonPath("$.theme").value("light"));
		getWithToken(SETTINGS, alice).andExpect(jsonPath("$.theme").value("dark"));
	}

	@Test
	void responsesContainOnlySettings() throws Exception {
		send(post(SETTINGS), alice, FULL).andExpect(status().isCreated());

		getWithToken(SETTINGS, alice)
			.andExpect(jsonPath("$.userId").doesNotExist())
			.andExpect(jsonPath("$.user").doesNotExist())
			.andExpect(content().string(not(containsString("alice@example.com"))))
			.andExpect(content().string(not(containsString("password"))))
			.andExpect(content().string(not(containsString("$2a$"))))
			.andExpect(content().string(not(containsString("token"))));
	}

	@Test
	void databaseErrorsDoNotLeakDetails() throws Exception {
		// A rule only the database knows, so the request passes validation and fails on insert.
		jdbc.execute("ALTER TABLE user_settings ADD CONSTRAINT chk_test_secret_rule CHECK (location <> 'Atlantis')");
		try {
			send(post(SETTINGS), alice, "{\"location\": \"Atlantis\"}")
				.andExpect(result -> assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(400))
				.andExpect(content().string(not(containsString("chk_test_secret_rule"))))
				.andExpect(content().string(not(containsString("user_settings"))))
				.andExpect(content().string(not(containsString("SQL"))))
				.andExpect(content().string(not(containsString("Exception"))));
			assertThat(rows()).isZero();
		}
		finally {
			jdbc.execute("ALTER TABLE user_settings DROP CONSTRAINT chk_test_secret_rule");
		}
	}

	/** An active account with a verified email and the given role slug; returns its id. */
	private long account(String email, String userType) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', ?, now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD), userType);
	}

	private String token(String loginPath, String email) throws Exception {
		return json(postJson(loginPath, "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private int rows() {
		return jdbc.queryForObject("SELECT count(*) FROM user_settings", Integer.class);
	}

}
