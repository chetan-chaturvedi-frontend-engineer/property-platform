package com.propertypro.property_platform.builderteam.api;

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
 * Builder team API tests through real logins, so every request goes through token validation and the
 * {@code users.user_type = roles.slug} permission lookup with the seeded roles. Bob and Carol are builders,
 * Alice and Dave their prospective employees, all with the seeded {@code user} role; Admin has the seeded
 * {@code admin} role. Subscriptions are inserted directly; roles changed or added by a test are restored.
 */
abstract class BuilderTeamApiTestSupport extends AbstractIntegrationTest {

	static final String APP = "/api/v1/builder-teams";
	static final String MEMBERSHIPS = "/api/v1/builder-team-memberships";
	static final String ADMIN = "/api/v1/admin/builder-teams";
	/** A team role whose permissions every app user holds. */
	static final String SALES_ROLE = "sales-executive";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final String PLAN_PREFIX = "team-plan-";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private int planCounter;

	long aliceId;
	long bobId;
	long carolId;
	long daveId;
	long adminId;
	String alice;
	String bob;
	String carol;
	String dave;
	String admin;

	@BeforeEach
	void setUpAccounts() throws Exception {
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug = ANY (?)",
				(Object) SEEDED_ROLES.toArray(String[]::new));
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Sales Executive', ?, ?::jsonb)", SALES_ROLE,
				"{\"lead\": {\"list\": true, \"view\": true}, \"site_visit\": {\"list\": true, \"view\": true}}");
		aliceId = account("alice@example.com", "user");
		bobId = account("bob@example.com", "user");
		carolId = account("carol@example.com", "user");
		daveId = account("dave@example.com", "user");
		adminId = account("admin@example.com", "admin");
		jdbc.update("UPDATE users SET phone = '+919876500001' WHERE id = ?", aliceId);
		alice = token("alice@example.com");
		bob = token("bob@example.com");
		carol = token("carol@example.com");
		dave = token("dave@example.com");
		admin = token("admin@example.com");
	}

	@AfterEach
	void restoreRolesAndData() {
		jdbc.execute("TRUNCATE users RESTART IDENTITY CASCADE");
		jdbc.update("DELETE FROM subscription_plans WHERE slug LIKE ?", PLAN_PREFIX + "%");
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

	/** A role with the given permissions JSON, e.g. {@code {"builder_team": {"list": true}}}. */
	void role(String slug, String permissions) {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug, permissions);
	}

	/** Replaces the seeded user role's permissions for this test; restored afterwards. */
	void appUserPermissions(String permissions) {
		jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = 'user'", permissions);
	}

	/** App users sign in through the app login, every other role through the admin login. */
	String token(String email) throws Exception {
		Boolean staff = jdbc.queryForObject("""
				SELECT coalesce((r.permissions -> 'admin_panel' ->> 'access')::boolean, false)
				FROM users u JOIN roles r ON r.slug = u.user_type WHERE u.email = ?""", Boolean.class, email);
		String path = Boolean.TRUE.equals(staff) ? "/api/v1/admin/login" : "/api/v1/auth/login";
		return json(postJson(path, "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	/** An active subscription in force with the given team member limit. */
	void subscribe(long userId, int teamMembers) {
		subscribe(userId, teamMembers, "active", "now() - interval '1 day'", "now() + interval '29 days'");
	}

	void subscribe(long userId, int teamMembers, String status, String startsAt, String endsAt) {
		String slug = PLAN_PREFIX + (++planCounter);
		Long planId = jdbc.queryForObject("""
				INSERT INTO subscription_plans (title, slug, price, status, no_of_team_members)
				VALUES ('Builder', ?, 10, 'active', ?) RETURNING id""", Long.class, slug, teamMembers);
		jdbc.update("""
				INSERT INTO user_subscriptions (user_id, subscription_plan_id, status, plan_title, price, currency,
				    billing_interval, billing_interval_count, no_of_team_members, starts_at, ends_at)
				VALUES (?, ?, ?, 'Builder', 10, 'INR', 'month', 1, ?, %s, %s)""".formatted(startsAt, endsAt),
				userId, planId, status, teamMembers);
	}

	/** Ends the user's active subscription, as a renewal or plan change would. */
	void expireSubscription(long userId) {
		jdbc.update("""
				UPDATE user_subscriptions SET status = 'expired', ends_at = now() - interval '1 minute',
				    starts_at = least(starts_at, now() - interval '2 minutes')
				WHERE user_id = ? AND status = 'active'""", userId);
	}

	static String invitation(String email) {
		return """
				{"email": "%s", "role": "%s"}""".formatted(email, SALES_ROLE);
	}

	long invite(String token, String email) throws Exception {
		return id(postAs(APP, token, invitation(email)).andExpect(status().isCreated()));
	}

	/** Inserts an active membership directly. */
	long member(long builderId, long employeeId, String status) {
		return jdbc.queryForObject("""
				INSERT INTO builder_teams (user_id, builder_id, employee_id, role, status, joined_at)
				VALUES (?, ?, ?, ?, ?, CASE WHEN ? IN ('active', 'inactive') THEN now() END) RETURNING id""",
				Long.class, builderId, builderId, employeeId, SALES_ROLE, status, status);
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

	static long id(ResultActions result) throws Exception {
		return Long.parseLong(json(result.andReturn().getResponse().getContentAsString(), "$.id"));
	}

	int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	/** One column as text; null when SQL NULL. Includes soft-deleted rows. */
	String column(long id, String column) {
		return jdbc.queryForObject("SELECT " + column + "::text FROM builder_teams WHERE id = ?", String.class, id);
	}

}
