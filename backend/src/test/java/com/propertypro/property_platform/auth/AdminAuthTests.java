package com.propertypro.property_platform.auth;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin-panel login with real accounts, passwords and tokens. Access depends only on the role's
 * {@code admin_panel.access} permission (users.user_type = roles.slug), never on the role's name.
 */
@ExtendWith(OutputCaptureExtension.class)
class AdminAuthTests extends AbstractIntegrationTest {

	private static final String LOGIN = "/api/v1/admin/login";
	private static final String ME = "/api/v1/admin/me";
	private static final String LOGOUT = "/api/v1/admin/logout";
	private static final String REFRESH = "/api/v1/admin/refresh";
	private static final String ADMIN_PLANS = "/api/v1/admin/subscription-plans";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;

	@BeforeEach
	void snapshotRoles() {
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug IN ('super-admin', 'admin', 'user')");
	}

	@AfterEach
	void restoreRoles() {
		jdbc.update("DELETE FROM roles WHERE slug <> ALL (?)", (Object) SEEDED_ROLES.toArray(String[]::new));
		originalRoles.forEach(role -> jdbc.update(
				"UPDATE roles SET name = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL WHERE slug = ?",
				role.get("name"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	// ---- Login ----

	@Test
	void adminWithAdminPanelAccessLogsIn() throws Exception {
		long adminId = account(ADMIN_EMAIL, "admin");

		adminLogin(ADMIN_EMAIL, PASSWORD)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.accessToken").isNotEmpty())
			.andExpect(jsonPath("$.refreshToken").isNotEmpty())
			.andExpect(jsonPath("$.expiresIn").value(900))
			.andExpect(jsonPath("$.user.id").value(adminId))
			.andExpect(jsonPath("$.user.email").value(ADMIN_EMAIL))
			.andExpect(jsonPath("$.user.role.slug").value("admin"))
			.andExpect(jsonPath("$.user.permissions", hasItem("ADMIN_PANEL_ACCESS")))
			.andExpect(jsonPath("$.user.permissions", hasItem("SUBSCRIPTION_PLAN_CREATE")))
			.andExpect(content().string(not(containsString("passwordHash"))))
			.andExpect(content().string(not(containsString("$2a$"))));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions WHERE user_id = ?", Integer.class, adminId))
			.isEqualTo(1);
	}

	@Test
	void anyRoleGrantedAdminPanelAccessLogsInWithOnlyItsOwnPermissions() throws Exception {
		role("manager", "{\"admin_panel\": {\"access\": true}, \"property\": {\"list_any\": true}}");
		account("manager@example.com", "manager");

		String token = accessToken(adminLogin("manager@example.com", PASSWORD)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user.role.slug").value("manager"))
			.andExpect(jsonPath("$.user.permissions", contains("ADMIN_PANEL_ACCESS", "PROPERTY_LIST_ANY"))));

		withToken(get(ME), token).andExpect(status().isOk()).andExpect(jsonPath("$.role.slug").value("manager"));
		withToken(get("/api/v1/admin/properties"), token).andExpect(status().isOk());
		// Admin panel access is not a licence for every admin endpoint.
		withToken(get(ADMIN_PLANS), token).andExpect(status().isForbidden());
	}

	@ParameterizedTest(name = "{0}")
	@CsvSource(delimiter = '|', value = {
			"app user role          | user    | ",
			"role without access    | editor  | {\"property\": {\"list_any\": true}}",
			"access explicitly off  | support | {\"admin_panel\": {\"access\": false}}",
			"role named admin-ish   | admins  | {\"role\": {\"view\": true}}" })
	void roleWithoutAdminPanelAccessIsDenied(String name, String slug, String permissions) throws Exception {
		if (permissions != null) {
			role(slug, permissions);
		}
		long userId = account("staff@example.com", slug);

		adminLogin("staff@example.com", PASSWORD)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("admin_access_denied"))
			.andExpect(jsonPath("$.detail").value("You do not have permission to access the admin panel."))
			.andExpect(jsonPath("$.accessToken").doesNotExist());
		assertThat(sessions(userId)).isZero();
	}

	@Test
	void userTypeWithoutMatchingRoleIsDenied() throws Exception {
		long userId = account("ghost@example.com", "ghost");

		adminLogin("ghost@example.com", PASSWORD)
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("admin_access_denied"));
		assertThat(sessions(userId)).isZero();
	}

	@Test
	void inactiveOrDeletedRoleIsDenied() throws Exception {
		role("manager", "{\"admin_panel\": {\"access\": true}}");
		account("manager@example.com", "manager");

		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'manager'");
		adminLogin("manager@example.com", PASSWORD).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("admin_access_denied"));

		jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'manager'");
		adminLogin("manager@example.com", PASSWORD).andExpect(status().isForbidden());
	}

	@Test
	void invalidCredentialsGetOneGenericAnswer() throws Exception {
		account(ADMIN_EMAIL, "admin");

		String wrongPassword = adminLogin(ADMIN_EMAIL, "Wrong!Pass1").andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"))
			.andReturn().getResponse().getContentAsString();
		String unknownAccount = adminLogin("nobody@example.com", PASSWORD).andExpect(status().isUnauthorized())
			.andReturn().getResponse().getContentAsString();

		assertThat(wrongPassword).isEqualTo(unknownAccount);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions", Integer.class)).isZero();
	}

	@Test
	void deletedAccountLooksUnknown() throws Exception {
		account(ADMIN_EMAIL, "admin");
		jdbc.update("UPDATE users SET deleted_at = now()");

		adminLogin(ADMIN_EMAIL, PASSWORD).andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"));
	}

	@ParameterizedTest(name = "status={0}")
	@CsvSource({ "suspended, account_inactive", "inactive, account_inactive", "rejected, account_inactive",
			"closed, account_inactive", "pending, verification_required" })
	void ineligibleAccountStatesCannotLogIn(String accountStatus, String code) throws Exception {
		long adminId = account(ADMIN_EMAIL, "admin");
		jdbc.update("UPDATE users SET status = ? WHERE id = ?", accountStatus, adminId);

		adminLogin(ADMIN_EMAIL, PASSWORD).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(code));
		assertThat(sessions(adminId)).isZero();
	}

	@Test
	void unverifiedAccountCannotLogIn() throws Exception {
		long adminId = account(ADMIN_EMAIL, "admin");
		jdbc.update("UPDATE users SET email_verified = NULL WHERE id = ?", adminId);

		adminLogin(ADMIN_EMAIL, PASSWORD).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("verification_required"));
	}

	@Test
	void phoneNumberIsAlsoALoginIdentifier() throws Exception {
		long adminId = account(ADMIN_EMAIL, "admin");
		jdbc.update("UPDATE users SET phone = ? WHERE id = ?", PHONE_E164, adminId);

		adminLogin(PHONE, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.user.id").value(adminId));
		adminLogin("  ADMIN@Example.COM ", PASSWORD).andExpect(status().isOk());
	}

	@Test
	void missingAndMalformedFieldsAreRejected() throws Exception {
		postJson(LOGIN, "{}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.identifier").exists())
			.andExpect(jsonPath("$.errors.password").exists());
		postJson(LOGIN, "{\"identifier\":\"not an email or phone\",\"password\":\"x\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.identifier").value("must be a valid email address or phone number"));
		postJson(LOGIN, "{\"identifier\":\"" + "a".repeat(250) + "@example.com\",\"password\":\"x\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.identifier").exists());
		postJson(LOGIN, "{\"identifier\":\"a@b.co\",\"password\":\"" + "x".repeat(129) + "\"}")
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.password").exists());
		postJson(LOGIN, "{\"identifier\":[\"a@b.co\"],\"password\":\"x\"}").andExpect(status().isBadRequest());
		postJson(LOGIN, "{not json").andExpect(status().isBadRequest())
			.andExpect(content().string(not(containsString("Exception"))));
		postJson(LOGIN, "{\"identifier\":\"a@b.co\",\"password\":\"" + "x".repeat(70_000) + "\"}")
			.andExpect(status().isContentTooLarge());
	}

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = { "\"role\":\"admin\"", "\"userType\":\"admin\"", "\"user_type\":\"admin\"",
			"\"permissions\":[\"ADMIN_PANEL_ACCESS\"]", "\"isAdmin\":true" })
	void requestCannotClaimARoleOrPermission(String field) throws Exception {
		long userId = account("user@example.com", "user");

		postJson(LOGIN, "{\"identifier\":\"user@example.com\",\"password\":\"%s\",%s}".formatted(PASSWORD, field))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"));
		assertThat(sessions(userId)).isZero();
		assertThat(jdbc.queryForObject("SELECT user_type FROM users WHERE id = ?", String.class, userId))
			.isEqualTo("user");
	}

	// ---- Brute force ----

	@Test
	void failedLoginsAreRateLimitedPerAccountWithoutAffectingOthers() throws Exception {
		account(ADMIN_EMAIL, "admin");
		account("other-admin@example.com", "admin");
		for (int i = 0; i < 5; i++) {
			adminLogin(ADMIN_EMAIL, "Wrong!Pass1").andExpect(status().isUnauthorized());
		}

		// Even the correct password is refused until the window passes; the limit is temporary.
		adminLogin(ADMIN_EMAIL, PASSWORD)
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("rate_limited"));
		adminLogin("other-admin@example.com", PASSWORD).andExpect(status().isOk());
		rateLimiter.reset();
		adminLogin(ADMIN_EMAIL, PASSWORD).andExpect(status().isOk());
	}

	@Test
	void adminAndAppLoginFailuresAreCountedSeparately() throws Exception {
		registerActiveUser();
		for (int i = 0; i < 5; i++) {
			adminLogin(EMAIL, "Wrong!Pass1").andExpect(status().isUnauthorized());
		}

		login(EMAIL, PASSWORD).andExpect(status().isOk());
	}

	// ---- Protected endpoints and sessions ----

	@Test
	void protectedAdminEndpointsNeedAuthentication() throws Exception {
		mvc.perform(get(ME)).andExpect(status().isUnauthorized());
		mvc.perform(post(LOGOUT)).andExpect(status().isUnauthorized());
		mvc.perform(get(ADMIN_PLANS)).andExpect(status().isUnauthorized());
		mvc.perform(get(ME).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt")).andExpect(status().isUnauthorized());
	}

	@Test
	void appUserTokenCannotUseAdminEndpoints() throws Exception {
		registerActiveUser();
		String appToken = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

		withToken(get(ME), appToken).andExpect(status().isForbidden());
		withToken(get(ADMIN_PLANS), appToken).andExpect(status().isForbidden());
		withToken(get("/api/v1/admin/properties"), appToken).andExpect(status().isForbidden());
	}

	@Test
	void meReturnsSafeProfileAndCurrentPermissions() throws Exception {
		account(ADMIN_EMAIL, "admin");
		String token = accessToken(adminLogin(ADMIN_EMAIL, PASSWORD));

		withToken(get(ME), token)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(ADMIN_EMAIL))
			.andExpect(jsonPath("$.role.name").value("Admin"))
			.andExpect(jsonPath("$.permissions", hasItem("ADMIN_PANEL_ACCESS")))
			.andExpect(jsonPath("$.passwordHash").doesNotExist())
			.andExpect(jsonPath("$.notificationToken").doesNotExist())
			.andExpect(jsonPath("$.panCard").doesNotExist());
	}

	@Test
	void revokedPermissionAppliesToTheNextRequestWithTheSameToken() throws Exception {
		role("manager", "{\"admin_panel\": {\"access\": true}, \"subscription_plan\": {\"list\": true}}");
		account("manager@example.com", "manager");
		String token = accessToken(adminLogin("manager@example.com", PASSWORD));
		withToken(get(ADMIN_PLANS), token).andExpect(status().isOk());

		// Specific permission removed: the panel stays open, that endpoint closes.
		jdbc.update("UPDATE roles SET permissions = '{\"admin_panel\": {\"access\": true}}' WHERE slug = 'manager'");
		withToken(get(ADMIN_PLANS), token).andExpect(status().isForbidden());
		withToken(get(ME), token).andExpect(status().isOk()).andExpect(jsonPath("$.permissions", contains("ADMIN_PANEL_ACCESS")));

		// Panel access removed: every admin endpoint closes at once.
		jdbc.update("UPDATE roles SET permissions = '{}' WHERE slug = 'manager'");
		withToken(get(ME), token).andExpect(status().isForbidden());

		// Granted again: works again without logging in.
		jdbc.update("UPDATE roles SET permissions = '{\"admin_panel\": {\"access\": true}}' WHERE slug = 'manager'");
		withToken(get(ME), token).andExpect(status().isOk());

		// Role disabled, or the user moved to a role without access.
		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'manager'");
		withToken(get(ME), token).andExpect(status().isForbidden());
		jdbc.update("UPDATE roles SET status = 'active' WHERE slug = 'manager'");
		jdbc.update("UPDATE users SET user_type = 'user' WHERE email = 'manager@example.com'");
		withToken(get(ME), token).andExpect(status().isForbidden());
	}

	@Test
	void blockingTheAccountEndsTheSessionImmediately() throws Exception {
		long adminId = account(ADMIN_EMAIL, "admin");
		String token = accessToken(adminLogin(ADMIN_EMAIL, PASSWORD));

		jdbc.update("UPDATE users SET status = 'suspended' WHERE id = ?", adminId);

		withToken(get(ME), token).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutRevokesAccessAndRefreshTokens() throws Exception {
		account(ADMIN_EMAIL, "admin");
		String body = adminLogin(ADMIN_EMAIL, PASSWORD).andReturn().getResponse().getContentAsString();
		String token = json(body, "$.accessToken");

		withToken(post(LOGOUT), token).andExpect(status().isOk()).andExpect(jsonPath("$.message").value("Logged out."));

		withToken(get(ME), token).andExpect(status().isUnauthorized());
		postJson(REFRESH, "{\"refreshToken\":\"%s\"}".formatted(json(body, "$.refreshToken")))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void logoutWorksEvenAfterAdminAccessWasRevoked() throws Exception {
		role("manager", "{\"admin_panel\": {\"access\": true}}");
		account("manager@example.com", "manager");
		String token = accessToken(adminLogin("manager@example.com", PASSWORD));
		jdbc.update("UPDATE roles SET permissions = '{}' WHERE slug = 'manager'");

		withToken(post(LOGOUT), token).andExpect(status().isOk());
		assertThat(jdbc.queryForObject("SELECT revoked_reason FROM auth_sessions", String.class)).isEqualTo("admin_logout");
	}

	@Test
	void refreshRotatesTokensAndRechecksAdminAccess() throws Exception {
		role("manager", "{\"admin_panel\": {\"access\": true}}");
		account("manager@example.com", "manager");
		String body = adminLogin("manager@example.com", PASSWORD).andReturn().getResponse().getContentAsString();
		String firstRefresh = json(body, "$.refreshToken");

		String refreshed = postJson(REFRESH, "{\"refreshToken\":\"%s\"}".formatted(firstRefresh))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user.role.slug").value("manager"))
			.andReturn().getResponse().getContentAsString();
		assertThat(json(refreshed, "$.refreshToken")).isNotEqualTo(firstRefresh);
		// A used refresh token is rejected (and revokes the session).
		postJson(REFRESH, "{\"refreshToken\":\"%s\"}".formatted(firstRefresh)).andExpect(status().isUnauthorized());

		String second = json(adminLogin("manager@example.com", PASSWORD).andReturn().getResponse().getContentAsString(),
				"$.refreshToken");
		jdbc.update("UPDATE roles SET permissions = '{}' WHERE slug = 'manager'");
		postJson(REFRESH, "{\"refreshToken\":\"%s\"}".formatted(second))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("admin_access_denied"))
			.andExpect(jsonPath("$.accessToken").doesNotExist());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions WHERE revoked_reason = 'admin_access_revoked'",
				Integer.class)).isEqualTo(1);
	}

	@Test
	void tamperedTokensAreRejected() throws Exception {
		account("user@example.com", "user");
		long adminId = account(ADMIN_EMAIL, "admin");
		registerActiveUser();
		String appToken = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
		String[] parts = appToken.split("\\.");
		Base64.Decoder decoder = Base64.getUrlDecoder();
		Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();

		// Pretend to be the admin, or add permissions: the signature no longer matches.
		String payload = new String(decoder.decode(parts[1]), StandardCharsets.UTF_8);
		String asAdmin = payload.replaceFirst("\"sub\":\"\\d+\"", "\"sub\":\"" + adminId + "\"");
		String withScopes = payload.replaceFirst("\\{", "{\"scope\":\"ADMIN_PANEL_ACCESS\",\"authorities\":[\"ADMIN_PANEL_ACCESS\"],");
		for (String forged : List.of(asAdmin, withScopes)) {
			String token = parts[0] + "." + encoder.encodeToString(forged.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];
			withToken(get(ME), token).andExpect(status().isUnauthorized());
		}
		// Unsigned ("alg": "none") tokens are rejected too.
		String none = encoder.encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8)) + "."
				+ encoder.encodeToString(asAdmin.getBytes(StandardCharsets.UTF_8)) + ".";
		withToken(get(ME), none).andExpect(status().isUnauthorized());
	}

	@Test
	void appLoginStillRejectsStaffAccounts() throws Exception {
		account(ADMIN_EMAIL, "admin");

		login(ADMIN_EMAIL, PASSWORD).andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("invalid_credentials"));
	}

	@Test
	void credentialsNeverAppearInLogs(CapturedOutput output) throws Exception {
		account(ADMIN_EMAIL, "admin");
		adminLogin(ADMIN_EMAIL, "Wrong!Secret9").andExpect(status().isUnauthorized());
		String body = adminLogin(ADMIN_EMAIL, PASSWORD).andReturn().getResponse().getContentAsString();
		String token = json(body, "$.accessToken");
		withToken(post(LOGOUT), token).andExpect(status().isOk());

		assertThat(output.getAll())
			.contains("Admin login failed", "Admin login succeeded")
			.doesNotContain(PASSWORD, "Wrong!Secret9", token, json(body, "$.refreshToken"));
	}

	// ---- Helpers ----

	/** An active account with a verified email, the test password and the given role slug. */
	private long account(String email, String userType) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Staff Member', 'active', ?, now()) RETURNING id""",
				Long.class, email, passwordEncoder.encode(PASSWORD), userType);
	}

	private void role(String slug, String permissions) {
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)",
				Character.toUpperCase(slug.charAt(0)) + slug.substring(1), slug, permissions);
	}

	private ResultActions adminLogin(String identifier, String password) throws Exception {
		return postJson(LOGIN, "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(identifier, password));
	}

	private ResultActions withToken(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
			String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private static String accessToken(ResultActions login) throws Exception {
		return json(login.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	private int sessions(long userId) {
		return jdbc.queryForObject("SELECT count(*) FROM auth_sessions WHERE user_id = ?", Integer.class, userId);
	}

}
