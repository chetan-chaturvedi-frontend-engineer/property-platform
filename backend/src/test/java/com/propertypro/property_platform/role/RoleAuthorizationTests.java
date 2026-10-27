package com.propertypro.property_platform.role;

import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Map;

import static com.propertypro.property_platform.security.Permissions.LEAD_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_INTERACTION_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_LIST;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_DELETE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_SCHEDULE_VIEW;
import static com.propertypro.property_platform.security.Permissions.LEAD_UPDATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_VIEW;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_CREATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_DELETE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_UPDATE;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ASSIGN;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_CREATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_LIST;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_SUBMIT_REPORT;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_STATUS;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_VIEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real logins resolve permissions from the role named by users.user_type. Only app users can log in
 * today, so these tests temporarily grant admin permissions to the {@code user} role and restore it.
 */
class RoleAuthorizationTests extends AbstractIntegrationTest {

	private static final String ADMIN_PLANS = "/api/v1/admin/subscription-plans";
	private static final String GRANTS_PLAN_LIST = """
			{"admin_panel": {"access": true}, "subscription_plan": {"list": true}}""";

	@Autowired
	private RolePermissionService rolePermissionService;

	private List<Map<String, Object>> originalRoles;
	private String accessToken;

	@BeforeEach
	void loginAppUser() throws Exception {
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug IN ('user', 'admin')");
		registerActiveUser();
		accessToken = json(loginBody(EMAIL, PASSWORD), "$.accessToken");
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update(
				"UPDATE roles SET name = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL WHERE slug = ?",
				role.get("name"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	@Test
	void seededUserRoleGrantsOnlyOwnerPermissionsAndNoAdminAccess() throws Exception {
		Long userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, EMAIL);
		assertThat(rolePermissionService.permissionsOfUser(userId))
			.containsExactlyInAnyOrder(LEAD_LIST, LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, PROPERTY_CREATE,
					PROPERTY_LIST, PROPERTY_VIEW, PROPERTY_UPDATE, PROPERTY_DELETE, LEAD_SCHEDULE_VIEW,
					LEAD_SCHEDULE_CREATE, LEAD_SCHEDULE_UPDATE, LEAD_SCHEDULE_DELETE, LEAD_INTERACTION_VIEW,
					LEAD_INTERACTION_CREATE, LEAD_INTERACTION_UPDATE, LEAD_INTERACTION_DELETE, SITE_VISIT_LIST,
					SITE_VISIT_VIEW, SITE_VISIT_CREATE, SITE_VISIT_UPDATE, SITE_VISIT_UPDATE_STATUS,
					SITE_VISIT_SUBMIT_REPORT, SITE_VISIT_ASSIGN);

		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());
	}

	/**
	 * Admins cannot log in yet, so the request carries a test JWT whose authorities are exactly what
	 * the authority converter resolves for an admin user from the admin role.
	 */
	@Test
	void adminRoleAuthorizesAdminEndpointsUntilDeactivated() throws Exception {
		jdbc.execute("TRUNCATE subscription_plans RESTART IDENTITY CASCADE");
		Long adminId = jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, user_type, status)
				VALUES ('admin@example.com', 'hash', 'Admin', 'admin', 'active') RETURNING id""", Long.class);

		RequestPostProcessor admin = resolvedJwt(adminId);
		mvc.perform(post(ADMIN_PLANS).with(admin).contentType(MediaType.APPLICATION_JSON).content("""
				{"title":"Gold","price":10}""")).andExpect(status().isCreated());
		mvc.perform(patch(ADMIN_PLANS + "/1/status").with(admin).contentType(MediaType.APPLICATION_JSON).content("""
				{"status":"active"}""")).andExpect(status().isOk());
		mvc.perform(get(ADMIN_PLANS).with(admin)).andExpect(status().isOk());

		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'admin'");
		mvc.perform(get(ADMIN_PLANS).with(resolvedJwt(adminId))).andExpect(status().isForbidden());

		jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'admin'");
		mvc.perform(get(ADMIN_PLANS).with(resolvedJwt(adminId))).andExpect(status().isForbidden());
	}

	private RequestPostProcessor resolvedJwt(Long userId) {
		return jwt().jwt(token -> token.subject(userId.toString()))
			.authorities(rolePermissionService.permissionsOfUser(userId)
				.stream()
				.<GrantedAuthority>map(SimpleGrantedAuthority::new)
				.toList());
	}

	@Test
	void permissionsGrantedToTheRoleApplyOnTheNextRequest() throws Exception {
		setUserRolePermissions(GRANTS_PLAN_LIST);

		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isOk());
	}

	@Test
	void inactiveRoleDeniesWithTheSameToken() throws Exception {
		setUserRolePermissions(GRANTS_PLAN_LIST);
		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isOk());

		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'user'");

		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());
	}

	@Test
	void softDeletedRoleDenies() throws Exception {
		setUserRolePermissions(GRANTS_PLAN_LIST);
		jdbc.update("UPDATE roles SET deleted_at = now() WHERE slug = 'user'");

		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());
	}

	@Test
	void falseOrMissingActionDenies() throws Exception {
		setUserRolePermissions("""
				{"admin_panel": {"access": true}, "subscription_plan": {"list": false}}""");
		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());

		setUserRolePermissions("""
				{"admin_panel": {"access": true}}""");
		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());

		setUserRolePermissions("""
				{"subscription_plan": {"list": true}}""");
		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());

		// Listing needs list; view only covers a single plan.
		setUserRolePermissions("""
				{"admin_panel": {"access": true}, "subscription_plan": {"view": true}}""");
		getWithToken(ADMIN_PLANS, accessToken).andExpect(status().isForbidden());
	}

	@Test
	void registrationCannotChooseARole() throws Exception {
		postJson("/api/v1/auth/register", """
				{"fullName":"Eve","email":"eve@example.com","phone":"98765 43211","password":"%s",
				 "passwordConfirmation":"%s","userType":"admin","role":"admin","user_type":"admin",
				 "permissions":{"admin_panel":{"access":true}}}""".formatted(PASSWORD, PASSWORD))
			.andExpect(status().isCreated());

		assertThat(jdbc.queryForObject("SELECT user_type FROM users WHERE email = 'eve@example.com'", String.class))
			.isEqualTo("user");
		assertThat(jdbc.queryForObject("SELECT permissions::text FROM roles WHERE slug = 'user'", String.class))
			.doesNotContain("admin_panel");
	}

	@Test
	void ordinaryAppEndpointsStillOnlyNeedAuthentication() throws Exception {
		jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'user'");

		// No matching endpoint, but authentication succeeded: 404 rather than 401.
		getWithToken("/api/v1/does-not-exist", accessToken).andExpect(status().isNotFound());
	}

	private void setUserRolePermissions(String permissions) {
		jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = 'user'", permissions);
	}

}
