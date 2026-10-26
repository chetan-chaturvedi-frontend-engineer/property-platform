package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lead API tests through real logins, so every request goes through token validation and the
 * {@code users.user_type = roles.slug} permission lookup with the seeded {@code user} and
 * {@code admin} roles. Alice and Bob are app users; roles changed or added by a test are restored.
 */
abstract class LeadApiTestSupport extends AbstractIntegrationTest {

	static final String BASE = "/api/v1/leads";
	static final String LEAD = """
			{"leadName":"Ravi Kumar","phone":"98765 43210","purpose":"buy"}""";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;

	long aliceId;
	long bobId;
	long adminId;
	String alice;
	String bob;
	String admin;

	@BeforeEach
	void setUpAccounts() throws Exception {
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug = ANY (?)",
				(Object) SEEDED_ROLES.toArray(String[]::new));
		aliceId = account("alice@example.com", "user");
		bobId = account("bob@example.com", "user");
		adminId = account("admin@example.com", "admin");
		alice = token("alice@example.com");
		bob = token("bob@example.com");
		admin = token("admin@example.com");
	}

	/** Also leaves no committed rows behind for tests that do not truncate first (e.g. @DataJpaTest classes). */
	@AfterEach
	void restoreRolesAndData() {
		jdbc.execute("TRUNCATE users RESTART IDENTITY CASCADE");
		jdbc.update("DELETE FROM roles WHERE slug <> ALL (?)", (Object) SEEDED_ROLES.toArray(String[]::new));
		originalRoles.forEach(role -> jdbc.update(
				"UPDATE roles SET name = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL WHERE slug = ?",
				role.get("name"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	/** An active account with a verified email and the given role slug; returns its id. */
	long account(String email, String userType) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, ?, 'active', ?, now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD), email.substring(0, email.indexOf('@')), userType);
	}

	/**
	 * A new staff role with admin panel access (staff sign in through the admin login) plus the given
	 * modules, e.g. {@code "lead": {"view": true}}.
	 */
	void role(String slug, String modules) {
		String permissions = "{\"admin_panel\": {\"access\": true}" + (modules.isBlank() ? "" : ", " + modules) + "}";
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug, permissions);
	}

	/** App users sign in through the app login, every other role through the admin login. */
	String token(String email) throws Exception {
		String userType = jdbc.queryForObject("SELECT user_type FROM users WHERE email = ?", String.class, email);
		String path = "user".equals(userType) ? "/api/v1/auth/login" : "/api/v1/admin/login";
		return json(postJson(path, "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	ResultActions getAs(String path, String token) throws Exception {
		return mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	ResultActions postAs(String path, String token, String body) throws Exception {
		return send(post(path), token, body);
	}

	ResultActions patchAs(String path, String token, String body) throws Exception {
		return send(patch(path), token, body);
	}

	ResultActions deleteAs(String path, String token) throws Exception {
		return mvc.perform(delete(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	long createLead(String token) throws Exception {
		return createLead(token, LEAD);
	}

	long createLead(String token, String body) throws Exception {
		return id(postAs(BASE, token, body).andExpect(status().isCreated()));
	}

	long createSchedule(long leadId, String token, String body) throws Exception {
		return id(postAs(BASE + "/" + leadId + "/schedules", token, body).andExpect(status().isCreated()));
	}

	long createInteraction(long leadId, String token, String body) throws Exception {
		return id(postAs(BASE + "/" + leadId + "/interactions", token, body).andExpect(status().isCreated()));
	}

	static long id(ResultActions result) throws Exception {
		return Long.parseLong(json(result.andReturn().getResponse().getContentAsString(), "$.id"));
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	/** One column as text; null when SQL NULL. */
	String column(String table, long id, String column) {
		return jdbc.queryForObject("SELECT " + column + "::text FROM " + table + " WHERE id = ?", String.class, id);
	}

}
