package com.propertypro.property_platform.role.api;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin role management through real admin logins, so every request goes through token validation and the
 * users.user_type = roles.slug permission lookup. The admin (seeded admin role) is always user 1; roles changed by a
 * test are restored.
 */
class AdminRoleApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/roles";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final String VALID = """
			{"name":"Sales Manager","slug":"sales-manager","description":"  Runs the sales team  ","status":"active",\
			"permissions":{"admin_panel":{"access":true},"lead":{"list_any":true,"view_any":true,"assign":false}}}""";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("""
				SELECT slug, name, description, permissions::text AS permissions, status FROM roles WHERE slug = ANY (?)""",
				(Object) SEEDED_ROLES.toArray(String[]::new));
		account(ADMIN_EMAIL, "admin");
		admin = adminToken(ADMIN_EMAIL);
	}

	@AfterEach
	void restoreRoles() {
		jdbc.update("DELETE FROM roles WHERE slug <> ALL (?)", (Object) SEEDED_ROLES.toArray(String[]::new));
		originalRoles.forEach(role -> jdbc.update("""
				UPDATE roles SET name = ?, description = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL
				WHERE slug = ?""",
				role.get("name"), role.get("description"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	@Nested
	class Reading {

		@Test
		void listsRolesByNameWithUserCountsAndFlags() throws Exception {
			account("app1@example.com", "user");
			account("app2@example.com", "user");

			list("").andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].slug").value(contains("admin", "super-admin", "user")))
				.andExpect(jsonPath("$.totalElements").value(3))
				.andExpect(jsonPath("$.content[0].userCount").value(1))
				.andExpect(jsonPath("$.content[0].ownRole").value(true))
				.andExpect(jsonPath("$.content[0].defaultRole").value(true))
				.andExpect(jsonPath("$.content[0].manageable").value(true))
				.andExpect(jsonPath("$.content[0].permissions.role.view").value(true))
				.andExpect(jsonPath("$.content[0].description").isNotEmpty())
				.andExpect(jsonPath("$.content[1].superAdmin").value(true))
				.andExpect(jsonPath("$.content[1].manageable").value(false))
				.andExpect(jsonPath("$.content[2].userCount").value(2))
				.andExpect(jsonPath("$.content[2].ownRole").value(false));
		}

		@Test
		void searchesNameSlugAndDescriptionAndFiltersStatus() throws Exception {
			insertRole("Sales Executive", "sales-exec", "Handles enquiries", "{}", "active");
			insertRole("Archived", "archived", null, "{}", "inactive");

			list("?search=SALES").andExpect(jsonPath("$.content[*].slug").value(contains("sales-exec")));
			list("?search=enquir").andExpect(jsonPath("$.content[*].slug").value(contains("sales-exec")));
			list("?search=super-ad").andExpect(jsonPath("$.content[*].slug").value(contains("super-admin")));
			list("?search=100%25").andExpect(jsonPath("$.totalElements").value(0));
			list("?status=inactive").andExpect(jsonPath("$.content[*].slug").value(contains("archived")));
			list("?sort=name,desc&size=2&page=1")
				.andExpect(jsonPath("$.content[*].slug").value(contains("sales-exec", "archived")))
				.andExpect(jsonPath("$.totalPages").value(3));
		}

		@Test
		void excludesDeletedRoles() throws Exception {
			long id = insertRole("Gone", "gone", null, "{}", "active");
			jdbc.update("UPDATE roles SET deleted_at = now() WHERE id = ?", id);

			list("").andExpect(jsonPath("$.content[*].slug").value(not(hasItem("gone"))));
			perform(get(BASE + "/" + id), admin).andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("role_not_found"));
		}

		@ParameterizedTest
		@ValueSource(strings = { "?sort=permissions", "?sort=description", "?status=deleted" })
		void rejectsUnsafeSortsAndInvalidFilters(String query) throws Exception {
			list(query).andExpect(status().isBadRequest());
		}

		@Test
		void statsCountRolesPermissionsAndAdminUsers() throws Exception {
			insertRole("Archived", "archived", null, "{\"admin_panel\": {\"access\": true}}", "inactive");
			account("app@example.com", "user");
			account("old@example.com", "archived");
			long deleted = account("deleted@example.com", "admin");
			jdbc.update("UPDATE users SET deleted_at = now() WHERE id = ?", deleted);

			perform(get(BASE + "/stats"), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.totalRoles").value(4))
				.andExpect(jsonPath("$.activeRoles").value(3))
				.andExpect(jsonPath("$.defaultRoles").value(3))
				.andExpect(jsonPath("$.totalPermissions").value(org.hamcrest.Matchers.greaterThan(50)))
				.andExpect(jsonPath("$.adminUsers").value(1));
		}

		@Test
		void permissionCatalogListsModulesWithActionCodes() throws Exception {
			perform(get(BASE + "/permissions"), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$[0].key").value("admin_panel"))
				.andExpect(jsonPath("$[0].label").value("Admin Panel"))
				.andExpect(jsonPath("$[0].actions[0].key").value("access"))
				.andExpect(jsonPath("$[0].actions[0].code").value("ADMIN_PANEL_ACCESS"))
				.andExpect(jsonPath("$[?(@.key == 'site_visit')].actions[*].code").value(hasItem("SITE_VISIT_LIST_ANY")));
		}

		@Test
		void detailsIncludeTheUserCount() throws Exception {
			long id = roleId("user");
			account("app@example.com", "user");
			perform(get(BASE + "/" + id), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.slug").value("user"))
				.andExpect(jsonPath("$.userCount").value(1))
				.andExpect(jsonPath("$.createdAt").exists());
		}

		private ResultActions list(String query) throws Exception {
			return perform(get(URI.create(BASE + query)), admin);
		}

	}

	@Nested
	class Creating {

		@Test
		void createsARoleWithCatalogPermissions() throws Exception {
			postRole(VALID, admin).andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Sales Manager"))
				.andExpect(jsonPath("$.slug").value("sales-manager"))
				.andExpect(jsonPath("$.description").value("Runs the sales team"))
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.permissions.lead.list_any").value(true))
				.andExpect(jsonPath("$.permissions.lead.assign").value(false))
				.andExpect(jsonPath("$.userCount").value(0))
				.andExpect(jsonPath("$.defaultRole").value(false))
				.andExpect(jsonPath("$.manageable").value(true));

			assertThat(awaitLog("Role permissions granted").get("data").toString()).contains("LEAD_LIST_ANY");
			assertThat(awaitLog("Role: create")).containsEntry("module", "roles");
		}

		@Test
		void createsInactiveRolesAndAllowsNoPermissions() throws Exception {
			postRole("{\"name\":\"Draft Role\",\"slug\":\"draft\",\"status\":\"inactive\"}", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.description").isEmpty());
		}

		@Test
		void rejectsDuplicateNamesAndSlugsIncludingDeletedSlugs() throws Exception {
			postRole(VALID.replace("sales-manager", "other"), admin).andExpect(status().isCreated());
			postRole(VALID.replace("Sales Manager", "sales MANAGER "), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_already_exists"))
				.andExpect(jsonPath("$.errors.name").exists());

			long gone = insertRole("Gone", "gone", null, "{}", "active");
			jdbc.update("UPDATE roles SET deleted_at = now() WHERE id = ?", gone);
			postRole("{\"name\":\"New\",\"slug\":\"gone\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.slug").exists());
			postRole("{\"name\":\"Root\",\"slug\":\"super-admin\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_slug_reserved"));
		}

		@ParameterizedTest
		@ValueSource(strings = {
				"{\"name\":\"\",\"slug\":\"ok\"}",
				"{\"name\":\"Ops\",\"slug\":\"Bad Slug\"}",
				"{\"name\":\"Ops\",\"slug\":\"ops\",\"status\":\"archived\"}",
				"{\"name\":\"Ops\",\"slug\":\"ops\",\"id\":5}",
				"{\"name\":\"Ops\",\"slug\":\"ops\",\"permissions\":{\"secret\":{\"read\":true}}}",
				"{\"name\":\"Ops\",\"slug\":\"ops\",\"permissions\":{\"lead\":{\"launch\":true}}}",
				"{\"name\":\"Ops\",\"slug\":\"ops\",\"permissions\":{\"lead\":{\"view\":\"yes\"}}}" })
		void rejectsInvalidRequests(String json) throws Exception {
			postRole(json, admin).andExpect(status().isBadRequest());
			assertThat(jdbc.queryForObject("SELECT count(*) FROM roles WHERE slug = 'ops'", Integer.class)).isZero();
		}

		@Test
		void callersCannotGrantPermissionsTheyDoNotHold() throws Exception {
			String ops = staff("ops", "{\"view\": true, \"create\": true}");
			postRole("{\"name\":\"Escalated\",\"slug\":\"escalated\",\"permissions\":{\"user\":{\"delete\":true}}}", ops)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("role_permission_escalation"));
			postRole("{\"name\":\"Viewer\",\"slug\":\"viewer\",\"permissions\":{\"role\":{\"view\":true}}}", ops)
				.andExpect(status().isCreated());
		}

	}

	@Nested
	class Updating {

		@Test
		void editsDetailsPermissionsAndStatus() throws Exception {
			long id = insertRole("Sales", "sales", "Old", "{\"lead\": {\"list_any\": true}}", "active");

			patchRole(id, """
					{"name":"Sales Team","description":null,"status":"inactive",\
					"permissions":{"lead":{"list_any":false,"view_any":true}}}""", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Sales Team"))
				.andExpect(jsonPath("$.slug").value("sales"))
				.andExpect(jsonPath("$.description").isEmpty())
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.permissions.lead.view_any").value(true))
				.andExpect(jsonPath("$.permissions.lead.list_any").value(false));

			String data = awaitLog("Role permissions changed").get("data").toString();
			assertThat(data).contains("\"added\": [\"LEAD_VIEW_ANY\"]", "\"removed\": [\"LEAD_LIST_ANY\"]");
			assertThat(awaitLog("Role status changed").get("data").toString()).contains("inactive");
		}

		@Test
		void omittedFieldsKeepTheirValues() throws Exception {
			long id = insertRole("Sales", "sales", "Keeps", "{\"lead\": {\"list_any\": true}}", "active");
			patchRole(id, "{\"name\":\"Renamed\"}", admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value("Keeps"))
				.andExpect(jsonPath("$.permissions.lead.list_any").value(true));
		}

		@ParameterizedTest
		@ValueSource(strings = { "{\"slug\":\"new-slug\"}", "{\"name\":null}", "{\"status\":null}",
				"{\"permissions\":null}", "{\"permissions\":{\"secret\":{\"read\":true}}}" })
		void rejectsInvalidChanges(String json) throws Exception {
			long id = insertRole("Sales", "sales", null, "{}", "active");
			patchRole(id, json, admin).andExpect(status().isBadRequest());
		}

		@Test
		void rejectsDuplicateNames() throws Exception {
			long id = insertRole("Sales", "sales", null, "{}", "active");
			patchRole(id, "{\"name\":\"ADMIN\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.name").exists());
			patchRole(id, "{\"name\":\"Sales\"}", admin).andExpect(status().isOk());
		}

		@Test
		void superAdminIsNeverChanged() throws Exception {
			patchRole(roleId("super-admin"), "{\"name\":\"Root\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_super_admin_protected"));
		}

		@Test
		void callersCannotChangeTheStatusOrPermissionsOfTheirOwnRole() throws Exception {
			long own = roleId("admin");
			patchRole(own, "{\"status\":\"inactive\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_self_modification"));
			patchRole(own, "{\"permissions\":{\"admin_panel\":{\"access\":true}}}", admin)
				.andExpect(status().isConflict());
			patchRole(own, "{\"description\":\"Edited\",\"status\":\"active\"}", admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.description").value("Edited"));
			assertThat(jdbc.queryForObject("SELECT status FROM roles WHERE slug = 'admin'", String.class))
				.isEqualTo("active");
		}

		@Test
		void callersCannotChangeRolesWithPermissionsTheyDoNotHold() throws Exception {
			String ops = staff("ops", "{\"view\": true, \"update\": true}");
			long powerful = insertRole("Power", "power", null, "{\"user\": {\"delete\": true}}", "active");
			patchRole(powerful, "{\"name\":\"Renamed\"}", ops).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("role_permission_escalation"));
			perform(get(BASE + "/" + powerful), ops).andExpect(jsonPath("$.manageable").value(false));
			assertThat(jdbc.queryForObject("SELECT name FROM roles WHERE id = ?", String.class, powerful))
				.isEqualTo("Power");
		}

		@Test
		void unknownRolesAreNotFound() throws Exception {
			patchRole(999, "{\"name\":\"X Role\"}", admin).andExpect(status().isNotFound());
		}

	}

	@Nested
	class Deleting {

		@Test
		void softDeletesAndKeepsTheSlugReserved() throws Exception {
			long id = insertRole("Temp", "temp", null, "{}", "active");
			perform(delete(BASE + "/" + id), admin).andExpect(status().isNoContent());

			assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM roles WHERE id = ?", Boolean.class, id))
				.isTrue();
			perform(get(BASE + "/" + id), admin).andExpect(status().isNotFound());
			postRole("{\"name\":\"Temp Again\",\"slug\":\"temp\"}", admin).andExpect(status().isConflict());
		}

		@Test
		void protectedDefaultOwnAndAssignedRolesAreKept() throws Exception {
			perform(delete(BASE + "/" + roleId("super-admin")), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_super_admin_protected"));
			perform(delete(BASE + "/" + roleId("user")), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_default_protected"));

			long assigned = insertRole("Sales", "sales", null, "{}", "active");
			account("sales@example.com", "sales");
			perform(delete(BASE + "/" + assigned), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_in_use"))
				.andExpect(jsonPath("$.userCount").value(1));

			String ops = staff("ops", "{\"view\": true, \"delete\": true}");
			perform(delete(BASE + "/" + roleId("ops")), ops).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("role_self_modification"));
			assertThat(jdbc.queryForObject("SELECT count(*) FROM roles WHERE deleted_at IS NOT NULL", Integer.class))
				.isZero();
		}

		@Test
		void callersCannotDeleteRolesWithPermissionsTheyDoNotHold() throws Exception {
			String ops = staff("ops", "{\"view\": true, \"delete\": true}");
			long powerful = insertRole("Power", "power", null, "{\"user\": {\"delete\": true}}", "active");
			perform(delete(BASE + "/" + powerful), ops).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("role_permission_escalation"));
		}

	}

	@Nested
	class Security {

		@Test
		void requiresAuthentication() throws Exception {
			mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
			mvc.perform(withCsrf(post(BASE)).contentType(MediaType.APPLICATION_JSON).content(VALID))
				.andExpect(status().isUnauthorized());
		}

		@Test
		void everyEndpointNeedsItsPermission() throws Exception {
			long target = insertRole("Target", "target", null, "{}", "active");
			String nobody = staff("nobody", "{}");
			for (MockHttpServletRequestBuilder request : everyEndpoint(target)) {
				perform(request, nobody).andExpect(status().isForbidden());
			}
			String viewer = staff("viewer", "{\"view\": true}");
			perform(get(BASE), viewer).andExpect(status().isOk());
			perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(VALID), viewer)
				.andExpect(status().isForbidden());
			perform(patch(BASE + "/" + target).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Edited\"}"),
					viewer).andExpect(status().isForbidden());
			perform(delete(BASE + "/" + target), viewer).andExpect(status().isForbidden());
			assertThat(jdbc.queryForObject("SELECT name FROM roles WHERE id = ?", String.class, target)).isEqualTo("Target");
		}

		@Test
		void appUserTokenCannotUseAdminEndpoints() throws Exception {
			account("app@example.com", "user");
			perform(get(BASE), adminToken("app@example.com")).andExpect(status().isForbidden());
		}

		private List<MockHttpServletRequestBuilder> everyEndpoint(long target) {
			return List.of(get(BASE), get(BASE + "/stats"), get(BASE + "/permissions"), get(BASE + "/" + target),
					post(BASE).contentType(MediaType.APPLICATION_JSON).content(VALID),
					patch(BASE + "/" + target).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Edited\"}"),
					delete(BASE + "/" + target));
		}

	}

	/** A dashboard account whose role grants admin panel access plus the given {@code role} module actions. */
	private String staff(String slug, String roleActions) throws Exception {
		insertRole(slug, slug, null, "{\"admin_panel\": {\"access\": true}, \"role\": " + roleActions + "}", "active");
		String email = slug + "@example.com";
		account(email, slug);
		return adminToken(email);
	}

	private long insertRole(String name, String slug, String description, String permissions, String status) {
		return jdbc.queryForObject("""
				INSERT INTO roles (name, slug, description, permissions, status) VALUES (?, ?, ?, ?::jsonb, ?)
				RETURNING id""", Long.class, name, slug, description, permissions, status);
	}

	private long roleId(String slug) {
		return jdbc.queryForObject("SELECT id FROM roles WHERE slug = ?", Long.class, slug);
	}

	/** An active, email-verified account; returns its id. */
	private long account(String email, String userType) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Staff Member', 'active', ?, now()) RETURNING id""",
				Long.class, email, passwordEncoder.encode(PASSWORD), userType);
	}

	private String adminToken(String email) throws Exception {
		var login = postJson("/api/v1/admin/login", "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD));
		if (email.startsWith("app")) {
			// App roles have no admin panel access, so the admin login refuses them; use the app login instead.
			return accessToken(login("app@example.com", PASSWORD));
		}
		return accessToken(login);
	}

	private ResultActions postRole(String json, String token) throws Exception {
		return perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions patchRole(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private Map<String, Object> awaitLog(String action) {
		List<Map<String, Object>> rows = await().atMost(Duration.ofSeconds(5))
			.until(() -> jdbc.queryForList("""
					SELECT user_id, module, reference_id, additional_data::text AS data
					FROM system_logs WHERE action = ? ORDER BY id DESC""", action), found -> !found.isEmpty());
		return rows.get(0);
	}

}
