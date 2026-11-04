package com.propertypro.property_platform.activitylog;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Through real logins, so every request goes through token validation and the role lookup. Listing tests use
 * their own module: the logins themselves add authentication logs in the background.
 */
class AdminSystemLogApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/system-logs";
	private static final String MODULE = "test_logs";
	private static final String PANEL = "\"admin_panel\": {\"access\": true}";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private String admin;
	private Long adminId;

	@BeforeEach
	void setUp() throws Exception {
		adminId = account("admin@example.com", "admin");
		admin = token("admin@example.com");
	}

	@AfterEach
	void removeCustomRoles() {
		jdbc.update("TRUNCATE system_logs, users CASCADE");
		jdbc.update("DELETE FROM roles WHERE slug LIKE 'log-%'");
	}

	@Test
	void listsNewestFirstWithUserDetailsAndPageTotals() throws Exception {
		insert(adminId, "Older", "info", "10.0.0.1", 5L, "2026-11-01T10:00:00Z");
		insert(null, "Newer", "warning", "2001:db8::1", null, "2026-11-02T10:00:00Z");

		list("module=" + MODULE)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.totalPages").value(1))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.content[*].action", contains("Newer", "Older")))
			.andExpect(jsonPath("$.content[0].user", nullValue()))
			.andExpect(jsonPath("$.content[0].ipAddress").value("2001:db8::1"))
			.andExpect(jsonPath("$.content[1].user.id").value(adminId))
			.andExpect(jsonPath("$.content[1].user.fullName").value("Staff Member"))
			.andExpect(jsonPath("$.content[1].user.email").value("admin@example.com"))
			.andExpect(jsonPath("$.content[1].user.userType").value("admin"))
			.andExpect(jsonPath("$.content[1].user.status").value("active"))
			.andExpect(jsonPath("$.content[1].user.deleted").value(false))
			.andExpect(jsonPath("$.content[1].logLevel").value("info"))
			.andExpect(jsonPath("$.content[1].referenceId").value(5))
			.andExpect(jsonPath("$.content[1].additionalData.key").value("value"))
			.andExpect(jsonPath("$.content[1].createdAt").value("2026-11-01T10:00:00Z"));
	}

	@Test
	void paginates() throws Exception {
		for (int i = 1; i <= 3; i++) {
			insert(null, "Log " + i, "info", null, null, "2026-11-0" + i + "T10:00:00Z");
		}

		list("module=" + MODULE + "&page=1&size=2")
			.andExpect(jsonPath("$.content[*].action", contains("Log 1")))
			.andExpect(jsonPath("$.page").value(1))
			.andExpect(jsonPath("$.size").value(2))
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(2));
		list("module=" + MODULE + "&sort=createdAt,asc&size=1")
			.andExpect(jsonPath("$.content[*].action", contains("Log 1")));
	}

	@ParameterizedTest
	@CsvSource({ "logLevel=warning", "ipAddress=2001:db8::1", "action=REPORT", "referenceId=77",
			"createdFrom=2026-11-02T00:00:00Z", "createdTo=2026-11-02T10:00:00Z&createdFrom=2026-11-02T10:00:00Z" })
	void eachFilterSelectsItsRow(String filter) throws Exception {
		insert(null, "Other", "info", "10.0.0.1", 5L, "2026-11-01T10:00:00Z");
		insert(null, "Report exported", "warning", "2001:db8::1", 77L, "2026-11-02T10:00:00Z");

		list("module=" + MODULE + "&" + filter)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].action", contains("Report exported")));
	}

	@Test
	void filtersByUser() throws Exception {
		insert(adminId, "Mine", "info", null, null, "2026-11-01T10:00:00Z");
		insert(null, "System", "info", null, null, "2026-11-01T10:00:00Z");

		list("module=" + MODULE + "&userId=" + adminId)
			.andExpect(jsonPath("$.content[*].action", contains("Mine")));
	}

	@Test
	void searchTextIsNeverSql() throws Exception {
		insert(null, "100% done", "info", null, null, "2026-11-01T10:00:00Z");
		insert(null, "Other", "info", null, null, "2026-11-01T10:00:00Z");

		list("module=" + MODULE + "&action=' OR '1'='1").andExpect(jsonPath("$.content", hasSize(0)));
		searchAction("%").andExpect(jsonPath("$.content[*].action", contains("100% done")));
		searchAction("_").andExpect(jsonPath("$.content", hasSize(0)));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs WHERE module = ?", Long.class, MODULE))
			.isEqualTo(2);
	}

	@ParameterizedTest
	@CsvSource({ "page=-1,page", "page=abc,page", "page=1000001,page", "size=0,size", "size=101,size", "userId=0,userId",
			"userId=abc,userId", "module=Bad-Module,module", "logLevel=error,logLevel", "ipAddress=example.com,ipAddress",
			"ipAddress=999.1.1.1,ipAddress", "ipAddress=10.0.0.0/8,ipAddress", "referenceId=-1,referenceId",
			"createdFrom=yesterday,createdFrom", "sort=action,sort", "'module=x''; DROP TABLE system_logs;--',module" })
	void rejectsInvalidFilters(String query, String field) throws Exception {
		list(query)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors." + field).exists());
	}

	@Test
	void rejectsAnEndBeforeTheStartAndControlCharacters() throws Exception {
		list("createdFrom=2026-11-02T00:00:00Z&createdTo=2026-11-01T00:00:00Z")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.createdTo").exists());
		list("action=" + "a".repeat(101)).andExpect(status().isBadRequest());
		searchAction("a\u0000b").andExpect(status().isBadRequest());
	}

	@Test
	void viewsALogWithItsUser() throws Exception {
		Long id = insert(adminId, "Viewed", "success", "10.0.0.1", 9L, "2026-11-01T10:00:00Z");

		view(id, admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(id))
			.andExpect(jsonPath("$.user.email").value("admin@example.com"))
			.andExpect(jsonPath("$.module").value(MODULE))
			.andExpect(jsonPath("$.action").value("Viewed"))
			.andExpect(jsonPath("$.logLevel").value("success"))
			.andExpect(jsonPath("$.ipAddress").value("10.0.0.1"))
			.andExpect(jsonPath("$.referenceId").value(9))
			.andExpect(jsonPath("$.referenceType").value("Test"))
			.andExpect(jsonPath("$.additionalData.key").value("value"));
	}

	@Test
	void aSystemLogHasNoUser() throws Exception {
		view(insert(null, "System", "info", null, null, "2026-11-01T10:00:00Z"), admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user", nullValue()));
	}

	@Test
	void aSoftDeletedUserIsStillIdentified() throws Exception {
		Long other = account("gone@example.com", "user");
		Long id = insert(other, "Their log", "info", null, null, "2026-11-01T10:00:00Z");
		jdbc.update("UPDATE users SET deleted_at = now() WHERE id = ?", other);

		view(id, admin)
			.andExpect(jsonPath("$.user.email").value("gone@example.com"))
			.andExpect(jsonPath("$.user.deleted").value(true));
	}

	@Test
	void responsesNeverContainCredentials() throws Exception {
		jdbc.update("UPDATE users SET notification_token = 'push-token-value', aadhar_card = 'doc-key' WHERE id = ?", adminId);
		Long id = insert(adminId, "Safe", "info", null, null, "2026-11-01T10:00:00Z");
		String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, adminId);

		for (String body : new String[] { view(id, admin).andReturn().getResponse().getContentAsString(),
				list("module=" + MODULE).andReturn().getResponse().getContentAsString() }) {
			assertThat(body).contains("admin@example.com")
				.doesNotContain(hash, "password", "Hash", "push-token-value", "notificationToken", "doc-key", "aadhar");
		}
	}

	@Test
	void unknownAndMalformedIds() throws Exception {
		view(999_999_999L, admin)
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("system_log_not_found"));
		getWithToken(BASE + "/abc", admin).andExpect(status().isBadRequest());
		getWithToken(BASE + "/99999999999999999999", admin).andExpect(status().isBadRequest());
	}

	@Test
	void addsALogFromTheRequestContext() throws Exception {
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + admin)
				.header(HttpHeaders.USER_AGENT, "JUnit/5")
				.content("""
						{"module":"faqs","action":"  New FAQ added successfully ","logLevel":"info","referenceId":4,\
						"referenceType":"Faq","additionalData":{"slug":"shipping","nested":{"count":2}}}"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").isNumber())
			.andExpect(jsonPath("$.user.id").value(adminId))
			.andExpect(jsonPath("$.module").value("faqs"))
			.andExpect(jsonPath("$.action").value("New FAQ added successfully"))
			.andExpect(jsonPath("$.logLevel").value("info"))
			.andExpect(jsonPath("$.ipAddress").value("127.0.0.1"))
			.andExpect(jsonPath("$.userAgent").value("JUnit/5"))
			.andExpect(jsonPath("$.requestMethod").value("POST"))
			.andExpect(jsonPath("$.requestUrl").value(BASE))
			.andExpect(jsonPath("$.referenceId").value(4))
			.andExpect(jsonPath("$.additionalData.nested.count").value(2))
			.andExpect(jsonPath("$.createdAt").isNotEmpty());

		Map<String, Object> row = jdbc.queryForMap("SELECT user_id, created_at FROM system_logs WHERE module = 'faqs'");
		assertThat(row.get("user_id")).isEqualTo(adminId);
		assertThat(row.get("created_at")).isNotNull();
	}

	@ParameterizedTest
	@CsvSource({ "Failed login attempt detected,warning", "Unauthorized export blocked,warning",
			"New post created successfully,success", "Permission settings changed,success",
			"Monthly report opened,info" })
	void levelFollowsTheActionWhenOmitted(String action, String level) throws Exception {
		add("{\"action\":\"%s\"}".formatted(action))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.logLevel").value(level))
			.andExpect(jsonPath("$.module").value("system"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "userId", "user_id", "ipAddress", "userAgent", "requestMethod", "requestUrl", "createdAt", "id" })
	void clientsCannotSetProtectedFields(String field) throws Exception {
		add("{\"action\":\"Report opened\",\"%s\":\"1\"}".formatted(field))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + field).value("is not allowed"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM system_logs WHERE action = 'Report opened'", Long.class)).isZero();
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
		"{}|action",
		"{\"action\":\"   \"}|action",
		"{\"action\":\"Action performed\"}|action",
		"{\"action\":\"SOMETHING HAPPENED\"}|action",
		"{\"action\":5}|action",
		"{\"action\":\"a\\u0000b\"}|action",
		"{\"action\":\"Ok\",\"logLevel\":\"critical\"}|logLevel",
		"{\"action\":\"Ok\",\"module\":\"Not Valid\"}|module",
		"{\"action\":\"Ok\",\"referenceId\":0,\"referenceType\":\"Faq\"}|referenceId",
		"{\"action\":\"Ok\",\"referenceId\":\"x\"}|referenceId",
		"{\"action\":\"Ok\",\"referenceId\":5}|referenceType",
		"{\"action\":\"Ok\",\"referenceType\":\"a b\"}|referenceType",
		"{\"action\":\"Ok\",\"additionalData\":[1]}|additionalData",
		"{\"action\":\"Ok\",\"additionalData\":\"text\"}|additionalData",
		"{\"action\":\"Ok\",\"additionalData\":{\"password\":\"x\"}}|additionalData",
		"{\"action\":\"Ok\",\"additionalData\":{\"a\":[{\"api_key\":\"x\"}]}}|additionalData",
		"{\"action\":\"Ok\",\"additionalData\":{\"accessToken\":\"x\"}}|additionalData",
		"{\"action\":\"Ok\",\"additionalData\":{\"a\":\"b\\u0000\"}}|additionalData" })
	void rejectsInvalidBodies(String body, String field) throws Exception {
		add(body)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors." + field).exists());
	}

	@Test
	void rejectsMalformedJsonWithoutDetails() throws Exception {
		String body = add("{\"action\":").andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

		assertThat(body).doesNotContain("Exception", "tools.jackson", "com.propertypro");
	}

	@Test
	void everyEndpointNeedsAuthentication() throws Exception {
		mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
		mvc.perform(get(BASE + "/1")).andExpect(status().isUnauthorized());
		postJson(BASE, "{\"action\":\"Report opened\"}").andExpect(status().isUnauthorized());
	}

	@Test
	void appUsersAreForbidden() throws Exception {
		registerActiveUser();
		String user = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
		Long id = insert(null, "Secret", "info", null, null, "2026-11-01T10:00:00Z");

		getWithToken(BASE, user).andExpect(status().isForbidden());
		view(id, user).andExpect(status().isForbidden());
		add("{\"action\":\"Report opened\"}", user).andExpect(status().isForbidden());
	}

	@Test
	void adminPanelAccessAloneGrantsNothing() throws Exception {
		String staff = staff("log-none", "{" + PANEL + "}");
		Long id = insert(null, "Secret", "info", null, null, "2026-11-01T10:00:00Z");

		getWithToken(BASE, staff).andExpect(status().isForbidden());
		view(id, staff).andExpect(status().isForbidden());
		add("{\"action\":\"Report opened\"}", staff).andExpect(status().isForbidden());
	}

	@Test
	void eachPermissionOpensOnlyItsEndpoint() throws Exception {
		Long id = insert(null, "Secret", "info", null, null, "2026-11-01T10:00:00Z");

		String lister = staff("log-list", "{" + PANEL + ", \"system_log\": {\"list\": true}}");
		getWithToken(BASE, lister).andExpect(status().isOk());
		view(id, lister).andExpect(status().isForbidden());
		add("{\"action\":\"Report opened\"}", lister).andExpect(status().isForbidden());

		String viewer = staff("log-view", "{" + PANEL + ", \"system_log\": {\"view\": true}}");
		view(id, viewer).andExpect(status().isOk());
		getWithToken(BASE, viewer).andExpect(status().isForbidden());

		String writer = staff("log-add", "{" + PANEL + ", \"system_log\": {\"create\": true}}");
		add("{\"action\":\"Report opened\"}", writer).andExpect(status().isCreated());
		getWithToken(BASE, writer).andExpect(status().isForbidden());
	}

	@Test
	void adminAndSuperAdminAreTheOnlySeededRolesWithTheseGrants() {
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'system_log' ORDER BY slug", String.class))
			.containsExactly("admin", "super-admin");
	}

	private ResultActions list(String query) throws Exception {
		return getWithToken(BASE + "?" + query, admin);
	}

	/** As a parameter value: a {@code %} in a URL template would be encoded again. */
	private ResultActions searchAction(String action) throws Exception {
		return mvc.perform(get(BASE).param("module", MODULE).param("action", action)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + admin));
	}

	private ResultActions view(Long id, String token) throws Exception {
		return getWithToken(BASE + "/" + id, token);
	}

	private ResultActions add(String body) throws Exception {
		return add(body, admin);
	}

	private ResultActions add(String body, String token) throws Exception {
		return mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(body));
	}

	private Long insert(Long userId, String action, String level, String ip, Long referenceId, String createdAt) {
		return jdbc.queryForObject("""
				INSERT INTO system_logs (user_id, module, action, log_level, ip_address, reference_id, reference_type,
				                         additional_data, created_at)
				VALUES (?, ?, ?, ?, ?::inet, ?, CASE WHEN ?::bigint IS NULL THEN NULL ELSE 'Test' END,
				        '{"key": "value"}', ?::timestamptz)
				RETURNING id""", Long.class, userId, MODULE, action, level, ip, referenceId, referenceId, createdAt);
	}

	private Long account(String email, String role) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Staff Member', 'active', ?, now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD), role);
	}

	private String token(String email) throws Exception {
		return json(postJson("/api/v1/admin/login", "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	/** A logged-in staff member whose new role holds exactly these permissions. */
	private String staff(String slug, String permissions) throws Exception {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug, permissions);
		account(slug + "@example.com", slug);
		return token(slug + "@example.com");
	}

}
