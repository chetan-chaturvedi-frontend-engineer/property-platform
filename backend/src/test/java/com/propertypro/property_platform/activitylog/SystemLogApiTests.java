package com.propertypro.property_platform.activitylog;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.job.AuthCleanupJob;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The whole path: request, event, background write. Logs are awaited because they are stored after the response. */
class SystemLogApiTests extends AbstractIntegrationTest {

	private static final String FAQS = "/api/v1/admin/faqs";
	private static final String FAQ = """
			{"question":"Q?","answer":"A.","category":"general"}""";

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private SystemLogService systemLogService;

	@Autowired
	private AuthCleanupJob cleanupJob;

	@Test
	void loginIsLoggedWithTheRequestDetails() throws Exception {
		registerActiveUser();

		mvc.perform(post("/api/v1/auth/login?token=secret").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.USER_AGENT, "JUnit/5")
				.content("{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(EMAIL, PASSWORD)))
			.andExpect(status().isOk());

		Map<String, Object> log = awaitLog("User logged in");
		assertThat(log)
			.containsEntry("user_id", 1L)
			.containsEntry("module", "authentication")
			.containsEntry("log_level", "success")
			.containsEntry("ip", "127.0.0.1")
			.containsEntry("user_agent", "JUnit/5")
			.containsEntry("request_method", "POST")
			.containsEntry("request_url", "/api/v1/auth/login");
	}

	@Test
	void failedLoginsAreWarningsAndUnknownAccountsHaveNoUser() throws Exception {
		registerActiveUser();

		login(EMAIL, "Wr0ng!Pass").andExpect(status().isUnauthorized());
		assertThat(awaitLog("Failed login attempt"))
			.containsEntry("user_id", 1L)
			.containsEntry("log_level", "warning")
			.containsEntry("data", "{\"reason\": \"invalid_credentials\"}");

		jdbc.update("TRUNCATE system_logs");
		login("ghost@example.com", PASSWORD).andExpect(status().isUnauthorized());
		assertThat(awaitLog("Failed login attempt")).containsEntry("user_id", null);
	}

	@Test
	void logoutIsLoggedForTheAuthenticatedUser() throws Exception {
		registerActiveUser();
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

		mvc.perform(post("/api/v1/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());

		assertThat(awaitLog("User logged out")).containsEntry("user_id", 1L);
	}

	@Test
	void registrationAndPasswordResetAreLogged() throws Exception {
		registerActiveUser();
		assertThat(awaitLog("User registered"))
			.containsEntry("reference_type", "User")
			.containsEntry("reference_id", 1L);

		postJson("/api/v1/auth/forgot-password", "{\"identifier\":\"%s\"}".formatted(EMAIL))
			.andExpect(status().isAccepted());
		String code = outbox.awaitCode(EMAIL, OtpPurpose.PASSWORD_RESET);
		String wrong = code.equals("000000") ? "111111" : "000000";
		String body = "{\"identifier\":\"%s\",\"otp\":\"%s\",\"password\":\"N3w!Passw0rd\",\"passwordConfirmation\":\"N3w!Passw0rd\"}";

		postJson("/api/v1/auth/reset-password", body.formatted(EMAIL, wrong)).andExpect(status().isBadRequest());
		assertThat(awaitLog("Failed password reset attempt")).containsEntry("log_level", "warning");

		postJson("/api/v1/auth/reset-password", body.formatted(EMAIL, code)).andExpect(status().isOk());
		assertThat(awaitLog("Password changed by reset")).containsEntry("user_id", 1L);
	}

	@Test
	void refreshTokenReuseIsAWarning() throws Exception {
		registerActiveUser();
		String refresh = "{\"refreshToken\":\"%s\"}".formatted(json(loginBody(EMAIL, PASSWORD), "$.refreshToken"));
		postJson("/api/v1/auth/refresh", refresh).andExpect(status().isOk());

		postJson("/api/v1/auth/refresh", refresh).andExpect(status().isUnauthorized());

		assertThat(awaitLog("Refresh token reuse detected, session revoked")).containsEntry("log_level", "warning");
	}

	@Test
	void adminWritesAreLoggedAutomatically() throws Exception {
		String admin = adminToken("admin");

		mvc.perform(post(FAQS).contentType(MediaType.APPLICATION_JSON).content(FAQ).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isCreated());
		Long faqId = jdbc.queryForObject("SELECT max(id) FROM faqs", Long.class);
		assertThat(awaitLog("Faq: create"))
			.containsEntry("user_id", 1L)
			.containsEntry("module", "faqs")
			.containsEntry("log_level", "success")
			.containsEntry("reference_type", "Faq")
			.containsEntry("reference_id", faqId)
			.containsEntry("request_url", FAQS);

		mvc.perform(delete(FAQS + "/" + faqId).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isNoContent());
		assertThat(awaitLog("Faq: delete")).containsEntry("reference_id", faqId);
	}

	@Test
	void failedWritesAndOrdinaryReadsAreNotLogged() throws Exception {
		String admin = adminToken("admin");

		mvc.perform(post(FAQS).contentType(MediaType.APPLICATION_JSON).content("{}").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isBadRequest());
		getWithToken(FAQS, admin).andExpect(status().isOk());
		systemLogService.record(SystemLogEntry.info("test", "Marker"));

		awaitLog("Marker");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs WHERE module = 'faqs'", Long.class)).isZero();
	}

	@Test
	void sensitiveReadsAreLoggedAsInfo() throws Exception {
		getWithToken("/api/v1/admin/leads", adminToken("admin")).andExpect(status().isOk());

		assertThat(awaitLog("Viewed all leads"))
			.containsEntry("module", "leads")
			.containsEntry("log_level", "info")
			.containsEntry("request_method", "GET");
	}

	@Test
	void missingEndpointPermissionIsAWarning() throws Exception {
		jdbc.update("""
				INSERT INTO roles (name, slug, permissions) VALUES ('Panel only', 'panel-only',
				    '{"admin_panel": {"access": true}}'::jsonb)""");
		try {
			getWithToken(FAQS, adminToken("panel-only")).andExpect(status().isForbidden());

			assertThat(awaitLog("Access denied: Faq: list"))
				.containsEntry("user_id", 1L)
				.containsEntry("module", "permissions")
				.containsEntry("log_level", "warning");
		}
		finally {
			jdbc.update("TRUNCATE users CASCADE");
			jdbc.update("DELETE FROM roles WHERE slug = 'panel-only'");
		}
	}

	@Test
	void adminAreaDeniedByTheFilterChainIsAWarning() throws Exception {
		registerActiveUser();
		String token = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

		getWithToken(FAQS, token).andExpect(status().isForbidden());

		assertThat(awaitLog("Access denied by security policy"))
			.containsEntry("user_id", 1L)
			.containsEntry("request_url", FAQS);
	}

	@Test
	void adminLoginWithoutPanelAccessIsAWarning() throws Exception {
		registerActiveUser();

		postJson("/api/v1/admin/login", "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(EMAIL, PASSWORD))
			.andExpect(status().isForbidden());

		assertThat(awaitLog("Admin panel access denied")).containsEntry("user_id", 1L);
	}

	@Test
	void addingALogDoesNotLogItself() throws Exception {
		String admin = adminToken("admin");
		mvc.perform(post("/api/v1/admin/system-logs").contentType(MediaType.APPLICATION_JSON)
				.content("{\"action\":\"Report opened\"}").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isCreated());
		systemLogService.record(SystemLogEntry.info("test", "Marker"));

		awaitLog("Marker");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs WHERE action LIKE 'System log%'", Long.class))
			.isZero();
	}

	@Test
	void systemActivityHasNoUserOrRequestDetails() {
		// MockMvc leaves a request bound to the test thread; a scheduled job has none.
		RequestContextHolder.resetRequestAttributes();

		systemLogService.record(SystemLogEntry.info("authentication", "Expired authentication data removed")
			.withAdditionalData(Map.of("sessions", 3)));

		assertThat(awaitLog("Expired authentication data removed"))
			.containsEntry("user_id", null)
			.containsEntry("ip", null)
			.containsEntry("request_url", null)
			.containsEntry("data", "{\"sessions\": 3}");
	}

	@Test
	void aLogThatCannotBeStoredDoesNotFailTheRequest() throws Exception {
		systemLogService.record(SystemLogEntry.info("x".repeat(51), "Too long for the column"));
		systemLogService.record(SystemLogEntry.info(null, null));
		systemLogService.record(null);
		systemLogService.record(SystemLogEntry.info("test", "Marker"));

		awaitLog("Marker");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs", Long.class)).isOne();
	}

	@Test
	void cleanupOfAnUnverifiedRegistrationKeepsItsLogs() throws Exception {
		register(EMAIL, PHONE).andExpect(status().isCreated());
		awaitLog("User registered");
		jdbc.update("UPDATE users SET created_at = created_at - interval '365 days'");

		cleanupJob.cleanUp();

		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Long.class)).isZero();
		assertThat(awaitLog("User registered"))
			.containsEntry("user_id", null)
			.containsEntry("reference_id", 1L);
		assertThat(awaitLog("Expired authentication data removed")).containsEntry("user_id", null);
	}

	private Map<String, Object> awaitLog(String action) {
		List<Map<String, Object>> rows = await().atMost(Duration.ofSeconds(5))
			.until(() -> jdbc.queryForList("""
					SELECT user_id, module, log_level, host(ip_address) AS ip, user_agent, request_method, request_url,
					       reference_id, reference_type, additional_data::text AS data
					FROM system_logs WHERE action = ? ORDER BY id DESC""", action), found -> !found.isEmpty());
		return rows.get(0);
	}

	/** An active account with this role, logged in to the admin panel. Always user 1: tables were reset. */
	private String adminToken(String role) throws Exception {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES ('staff@example.com', ?, 'Staff Member', 'active', ?, now())""",
				passwordEncoder.encode(PASSWORD), role);
		String body = postJson("/api/v1/admin/login",
				"{\"identifier\":\"staff@example.com\",\"password\":\"%s\"}".formatted(PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		return json(body, "$.accessToken");
	}

}
