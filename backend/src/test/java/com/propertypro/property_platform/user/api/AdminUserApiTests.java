package com.propertypro.property_platform.user.api;

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
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin user management through real admin logins, so every request goes through token validation and the
 * users.user_type = roles.slug permission lookup. The admin is always user 1; roles changed by a test are restored.
 */
class AdminUserApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/users";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final String VALID = """
			{"fullName":"Neha Kapoor","email":"Neha@Example.com","phone":"98765 11111","password":"%s",\
			"passwordConfirmation":"%s","userType":"user","status":"active"}""".formatted(PASSWORD, PASSWORD);

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug = ANY (?)",
				(Object) SEEDED_ROLES.toArray(String[]::new));
		account(ADMIN_EMAIL, "admin", "active");
		admin = adminToken(ADMIN_EMAIL);
	}

	@AfterEach
	void restoreRoles() {
		jdbc.update("DELETE FROM roles WHERE slug <> ALL (?)", (Object) SEEDED_ROLES.toArray(String[]::new));
		originalRoles.forEach(role -> jdbc.update(
				"UPDATE roles SET name = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL WHERE slug = ?",
				role.get("name"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	@Nested
	class Listing {

		@Test
		void listsNewestFirstWithRoleNamesAndNoSensitiveFields() throws Exception {
			long user = account("app@example.com", "user", "pending");
			jdbc.update("UPDATE users SET aadhar_card = 'docs/secret.pdf', notification_token = 'push' WHERE id = ?", user);

			list("").andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.content[0].email").value("app@example.com"))
				.andExpect(jsonPath("$.content[0].userType").value("user"))
				.andExpect(jsonPath("$.content[0].role.name").value("User"))
				.andExpect(jsonPath("$.content[0].status").value("pending"))
				.andExpect(jsonPath("$.content[1].role.slug").value("admin"))
				.andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
				.andExpect(jsonPath("$.content[0].password").doesNotExist())
				.andExpect(jsonPath("$.content[0].aadharCard").doesNotExist())
				.andExpect(jsonPath("$.content[0].notificationToken").doesNotExist());
		}

		@Test
		void roleIsNullWhenNoRoleHasTheSlug() throws Exception {
			account("orphan@example.com", "no-such-role", "active");

			list("?search=orphan").andExpect(jsonPath("$.content[0].userType").value("no-such-role"))
				.andExpect(jsonPath("$.content[0].role").value(nullValue()));
		}

		@Test
		void excludesDeletedUsers() throws Exception {
			long user = account("gone@example.com", "user", "active");
			jdbc.update("UPDATE users SET deleted_at = now() WHERE id = ?", user);

			list("").andExpect(jsonPath("$.totalElements").value(1));
			perform(get(BASE + "/" + user), admin).andExpect(status().isNotFound());
		}

		@Test
		void searchesNameEmailAndPhoneDigits() throws Exception {
			seed();
			list("?search=ROHIT").andExpect(jsonPath("$.content[*].fullName").value(contains("Rohit Sharma")));
			list("?search=priya@").andExpect(jsonPath("$.content[*].fullName").value(contains("Priya Mehta")));
			list("?search=%2B91%2098000%200000").andExpect(jsonPath("$.totalElements").value(3));
			list("?search=12").andExpect(jsonPath("$.totalElements").value(0));
			list("?search=100%25").andExpect(jsonPath("$.totalElements").value(0));
		}

		@Test
		void combinesFiltersSearchSortingAndPaging() throws Exception {
			seed();
			list("?status=active&userType=user&sort=fullName,asc")
				.andExpect(jsonPath("$.content[*].fullName").value(contains("Aman Verma", "Rohit Sharma")));
			list("?status=active&userType=user&sort=fullName,desc&size=1&page=1")
				.andExpect(jsonPath("$.content[*].fullName").value(contains("Aman Verma")))
				.andExpect(jsonPath("$.totalElements").value(2))
				.andExpect(jsonPath("$.totalPages").value(2));
			list("?search=a&status=pending").andExpect(jsonPath("$.content[*].fullName").value(contains("Priya Mehta")));
			// The admin plus the four seeded users.
			list("?page=50").andExpect(jsonPath("$.content").value(hasSize(0)))
				.andExpect(jsonPath("$.totalElements").value(5));
		}

		@Test
		void filtersByCreatedDateRangeInclusive() throws Exception {
			seed();
			jdbc.update("UPDATE users SET created_at = '2026-01-10T23:30:00Z' WHERE email = 'rohit@example.com'");
			jdbc.update("UPDATE users SET created_at = '2026-01-12T00:00:00Z' WHERE email = 'aman@example.com'");

			list("?createdFrom=2026-01-10&createdTo=2026-01-11")
				.andExpect(jsonPath("$.content[*].fullName").value(contains("Rohit Sharma")));
			list("?createdFrom=2026-01-12&createdTo=2026-01-12")
				.andExpect(jsonPath("$.content[*].fullName").value(contains("Aman Verma")));
			list("?createdFrom=2026-02-01&createdTo=2026-01-01")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.createdTo").exists());
		}

		@ParameterizedTest
		@ValueSource(strings = { "?sort=passwordHash,asc", "?sort=aadharCard", "?status=unknown",
				"?userType=Bad%20Slug", "?createdFrom=yesterday" })
		void rejectsUnsafeSortsAndInvalidFilters(String query) throws Exception {
			list(query).andExpect(status().isBadRequest());
		}

		@Test
		void statsCountEveryStatusOfNonDeletedUsers() throws Exception {
			seed();
			long deleted = account("deleted@example.com", "user", "active");
			jdbc.update("UPDATE users SET deleted_at = now() WHERE id = ?", deleted);

			perform(get(BASE + "/stats"), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(5))
				.andExpect(jsonPath("$.byStatus.active").value(3))
				.andExpect(jsonPath("$.byStatus.pending").value(1))
				.andExpect(jsonPath("$.byStatus.inactive").value(1))
				.andExpect(jsonPath("$.byStatus.suspended").value(0))
				.andExpect(jsonPath("$.byStatus.closed").value(0));
		}

		@Test
		void roleOptionsComeFromTheRolesTableWithAssignability() throws Exception {
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Sales', 'sales', '{}'::jsonb)");
			jdbc.update("INSERT INTO roles (name, slug, permissions, status) VALUES ('Old', 'old', '{}'::jsonb, 'inactive')");
			jdbc.update("""
					INSERT INTO roles (name, slug, permissions) VALUES ('Auditor', 'auditor', '{"admin_panel": {"access": true}, "secret": {"read": true}}'::jsonb)""");

			perform(get(BASE + "/roles"), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.slug == 'sales')].assignable").value(contains(true)))
				.andExpect(jsonPath("$[?(@.slug == 'admin')].assignable").value(contains(true)))
				.andExpect(jsonPath("$[?(@.slug == 'super-admin')].assignable").value(contains(false)))
				.andExpect(jsonPath("$[?(@.slug == 'old')].assignable").value(contains(false)))
				.andExpect(jsonPath("$[?(@.slug == 'auditor')].assignable").value(contains(false)))
				.andExpect(jsonPath("$[*].permissions").doesNotExist());
		}

		@Test
		void detailsResolveTheRole() throws Exception {
			long user = account("app@example.com", "user", "active");
			perform(get(BASE + "/" + user), admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(user))
				.andExpect(jsonPath("$.role.name").value("User"))
				.andExpect(jsonPath("$.emailVerified").value(true));
			perform(get(BASE + "/999"), admin).andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("user_not_found"));
		}

		/** {@code query} must already be URL-encoded. */
		private ResultActions list(String query) throws Exception {
			return perform(get(URI.create(BASE + query)), admin);
		}

	}

	@Nested
	class Create {

		@Test
		void createsAccountWithHashedPasswordRoleSlugAndNoVerification() throws Exception {
			postUser(VALID, admin).andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(2))
				.andExpect(jsonPath("$.email").value("neha@example.com"))
				.andExpect(jsonPath("$.phone").value("+919876511111"))
				.andExpect(jsonPath("$.userType").value("user"))
				.andExpect(jsonPath("$.role.name").value("User"))
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.emailVerified").value(false))
				.andExpect(jsonPath("$.password").doesNotExist());

			String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = 2", String.class);
			assertThat(hash).isNotEqualTo(PASSWORD);
			assertThat(passwordEncoder.matches(PASSWORD, hash)).isTrue();
			assertThat(column(2, "user_type")).isEqualTo("user");
			assertThat(awaitLog("User: create")).containsEntry("module", "users").containsEntry("reference_id", 2L);
		}

		@Test
		void createdAppUserSignsInThroughTheExistingLoginOnceVerified() throws Exception {
			postUser(VALID, admin).andExpect(status().isCreated());
			login("neha@example.com", PASSWORD).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("verification_required"));

			jdbc.update("UPDATE users SET email_verified = now() WHERE id = 2");
			login("neha@example.com", PASSWORD).andExpect(status().isOk());
			// An app role has no admin panel access, so the admin login still refuses it.
			postJson("/api/v1/admin/login", "{\"identifier\":\"neha@example.com\",\"password\":\"%s\"}".formatted(PASSWORD))
				.andExpect(status().isForbidden());
		}

		@Test
		void signInReadyAccountSignsInRightAway() throws Exception {
			postUser(VALID.replace("{", "{\"emailVerified\":true,"), admin).andExpect(status().isCreated())
				.andExpect(jsonPath("$.emailVerified").value(true))
				.andExpect(jsonPath("$.phoneVerified").value(false));

			login("neha@example.com", PASSWORD).andExpect(status().isOk());
			assertThat(column(2, "email_verified")).isNotNull();
			assertThat(awaitLog("User email verified by admin")).containsEntry("user_id", 1L)
				.containsEntry("reference_id", 2L);
		}

		@Test
		void signInReadyAdminAccountCanUseTheDashboard() throws Exception {
			postUser(VALID.replace("{", "{\"emailVerified\":true,").replace("\"userType\":\"user\"",
					"\"userType\":\"admin\""), admin).andExpect(status().isCreated());

			accessToken(postJson("/api/v1/admin/login",
					"{\"identifier\":\"neha@example.com\",\"password\":\"%s\"}".formatted(PASSWORD)));
		}

		@ParameterizedTest
		@ValueSource(strings = { "pending", "inactive" })
		void signInReadyNeedsStatusActive(String status) throws Exception {
			postUser(VALID.replace("{", "{\"emailVerified\":true,").replace("\"active\"", "\"" + status + "\""), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.emailVerified").value("requires status active"));
			postUser(VALID.replace("{", "{\"emailVerified\":true,").replace(",\"status\":\"active\"", ""), admin)
				.andExpect(status().isBadRequest());
			assertThat(userCount()).isEqualTo(1);
		}

		@Test
		void signInReadyNeedsChangeStatus() throws Exception {
			String creator = staff("creator", "list", "create");
			postUser(VALID.replace("{", "{\"emailVerified\":true,"), creator).andExpect(status().isForbidden());
			postUser(VALID.replace("{", "{\"emailVerified\":true,").replace("\"active\"", "\"pending\""), creator)
				.andExpect(status().isBadRequest());
			assertThat(userCount()).isEqualTo(2);
		}

		@Test
		void defaultsToPending() throws Exception {
			postUser(VALID.replace(",\"status\":\"active\"", ""), admin).andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("pending"));
		}

		@Test
		void validatesFields() throws Exception {
			postUser("{}", admin).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.fullName").exists())
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.password").exists())
				.andExpect(jsonPath("$.errors.userType").exists());
			postUser(VALID.replace("Neha@Example.com", "not-an-email").replace("98765 11111", "12")
				.replace("\"passwordConfirmation\":\"" + PASSWORD, "\"passwordConfirmation\":\"Other!123"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.phone").exists())
				.andExpect(jsonPath("$.errors.passwordConfirmation").exists());
			postUser(VALID.replace("\"active\"", "\"suspended\""), admin).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.status").exists());
			assertThat(userCount()).isEqualTo(1);
		}

		@ParameterizedTest
		@ValueSource(strings = { "\"phoneVerified\":true", "\"id\":9", "\"aadharCard\":\"x\"", "\"passwordHash\":\"x\"" })
		void rejectsUnknownAndProtectedFields(String field) throws Exception {
			postUser(VALID.replace("{", "{" + field + ","), admin).andExpect(status().isBadRequest());
			assertThat(userCount()).isEqualTo(1);
		}

		@Test
		void rejectsDuplicateEmailOrPhoneIncludingDeletedAccounts() throws Exception {
			postUser(VALID, admin).andExpect(status().isCreated());
			postUser(VALID.replace("98765 11111", "98765 22222"), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("user_already_exists"))
				.andExpect(jsonPath("$.errors.email").value("is already in use"));
			postUser(VALID.replace("Neha@Example.com", "other@example.com"), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.phone").value("is already in use"));

			jdbc.update("UPDATE users SET deleted_at = now() WHERE id = 2");
			postUser(VALID, admin).andExpect(status().isConflict());
		}

		@Test
		void roleMustBeAnActiveExistingRole() throws Exception {
			postUser(VALID.replace("\"userType\":\"user\"", "\"userType\":\"ghost\""), admin)
				.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.userType").exists());
			jdbc.update("INSERT INTO roles (name, slug, permissions, status) VALUES ('Old', 'old', '{}'::jsonb, 'inactive')");
			postUser(VALID.replace("\"userType\":\"user\"", "\"userType\":\"old\""), admin)
				.andExpect(status().isBadRequest());
		}

		@Test
		void customRoleSlugIsStoredInUserType() throws Exception {
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Sales Executive', 'sales-executive', '{}'::jsonb)");
			postUser(VALID.replace("\"userType\":\"user\"", "\"userType\":\"sales-executive\""), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.role.name").value("Sales Executive"));
			assertThat(column(2, "user_type")).isEqualTo("sales-executive");
		}

		@Test
		void cannotAssignSuperAdminOrARoleWithPermissionsTheCallerLacks() throws Exception {
			postUser(VALID.replace("\"userType\":\"user\"", "\"userType\":\"super-admin\""), admin)
				.andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("user_role_forbidden"));
			jdbc.update("""
					INSERT INTO roles (name, slug, permissions) VALUES ('Auditor', 'auditor', '{"admin_panel": {"access": true}, "secret": {"read": true}}'::jsonb)""");
			postUser(VALID.replace("\"userType\":\"user\"", "\"userType\":\"auditor\""), admin)
				.andExpect(status().isForbidden());
			assertThat(userCount()).isEqualTo(1);
		}

		@Test
		void statusOtherThanPendingNeedsChangeStatus() throws Exception {
			String staff = staff("creator", "list", "create");
			postUser(VALID, staff).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("user_status_forbidden"));
			postUser(VALID.replace("\"active\"", "\"pending\""), staff).andExpect(status().isCreated());
		}

	}

	@Nested
	class Update {

		private long user;

		@BeforeEach
		void createUser() {
			user = account("app@example.com", "user", "active");
			jdbc.update("UPDATE users SET phone = '+919876500001', phone_verified = now() WHERE id = ?", user);
		}

		@Test
		void updatesOnlyTheGivenFields() throws Exception {
			patchUser(user, "{\"fullName\":\"  Renamed  \"}", admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.fullName").value("Renamed"))
				.andExpect(jsonPath("$.email").value("app@example.com"))
				.andExpect(jsonPath("$.phone").value("+919876500001"))
				.andExpect(jsonPath("$.phoneVerified").value(true));
		}

		@Test
		void changingEmailOrPhoneResetsItsVerificationAndEndsSessions() throws Exception {
			String session = accessToken(login("app@example.com", PASSWORD));

			patchUser(user, "{\"email\":\"NEW@example.com\",\"phone\":null}", admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("new@example.com"))
				.andExpect(jsonPath("$.emailVerified").value(false))
				.andExpect(jsonPath("$.phone").value(nullValue()))
				.andExpect(jsonPath("$.phoneVerified").value(false));
			getWithToken("/api/v1/auth/me", session).andExpect(status().isUnauthorized());
		}

		@Test
		void rejectsNullForRequiredFieldsAndUnknownFields() throws Exception {
			for (String field : List.of("fullName", "email", "userType", "status")) {
				patchUser(user, "{\"" + field + "\":null}", admin).andExpect(status().isBadRequest());
			}
			patchUser(user, "{\"password\":\"New!Pass123\"}", admin).andExpect(status().isBadRequest());
			patchUser(user, "{\"emailVerified\":false}", admin).andExpect(status().isBadRequest());
		}

		@Test
		void rejectsAnEmailInUse() throws Exception {
			patchUser(user, "{\"email\":\"" + ADMIN_EMAIL + "\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.errors.email").value("is already in use"));
			patchUser(user, "{\"email\":\"app@example.com\"}", admin).andExpect(status().isOk());
		}

		@Test
		void changesRoleAndStatusWithAuditEntries() throws Exception {
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Sales', 'sales', '{}'::jsonb)");

			patchUser(user, "{\"userType\":\"sales\",\"status\":\"suspended\"}", admin).andExpect(status().isOk())
				.andExpect(jsonPath("$.userType").value("sales"))
				.andExpect(jsonPath("$.role.name").value("Sales"))
				.andExpect(jsonPath("$.status").value("suspended"));

			assertThat(awaitLog("User role changed").get("data").toString())
				.contains("\"from\": \"user\"", "\"to\": \"sales\"");
			assertThat(awaitLog("User status changed").get("data").toString())
				.contains("\"from\": \"active\"", "\"to\": \"suspended\"");
			assertThat(awaitLog("User status changed")).containsEntry("user_id", 1L).containsEntry("reference_id", user);
		}

		@Test
		void blockingEndsSessions() throws Exception {
			String session = accessToken(login("app@example.com", PASSWORD));
			patchUser(user, "{\"status\":\"inactive\"}", admin).andExpect(status().isOk());

			getWithToken("/api/v1/auth/me", session).andExpect(status().isUnauthorized());
			login("app@example.com", PASSWORD).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("account_inactive"));
		}

		@Test
		void accountNeverReturnsToPending() throws Exception {
			patchUser(user, "{\"status\":\"pending\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("user_invalid_status_transition"));
		}

		@Test
		void sendingTheCurrentStatusOrRoleIsNotAChange() throws Exception {
			String editor = staff("editor", "list", "update");
			patchUser(user, "{\"status\":\"active\",\"userType\":\"user\",\"fullName\":\"Same\"}", editor)
				.andExpect(status().isOk());
		}

		@Test
		void statusChangeNeedsChangeStatus() throws Exception {
			String editor = staff("editor", "list", "update");
			patchUser(user, "{\"status\":\"inactive\"}", editor).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("user_status_forbidden"));
			patchUser(user, "{\"fullName\":\"Allowed\"}", editor).andExpect(status().isOk());
			assertThat(column(user, "status")).isEqualTo("active");
		}

		@Test
		void cannotChangeOwnRoleOrStatus() throws Exception {
			patchUser(1, "{\"status\":\"inactive\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("user_self_modification"));
			patchUser(1, "{\"userType\":\"user\"}", admin).andExpect(status().isConflict());
			patchUser(1, "{\"fullName\":\"Asha A.\"}", admin).andExpect(status().isOk());
		}

		@Test
		void superAdminAccountsAreProtected() throws Exception {
			long boss = account("boss@example.com", "super-admin", "active");
			patchUser(boss, "{\"fullName\":\"Edited\"}", admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("user_protected"));
			perform(delete(BASE + "/" + boss), admin).andExpect(status().isConflict());
		}

		@Test
		void cannotManageUsersWithMorePermissionsThanTheCaller() throws Exception {
			String manager = staff("manager", "list", "view", "update", "change_status", "delete");
			// The admin role grants far more than this manager holds.
			long otherAdmin = account("other-admin@example.com", "admin", "active");

			patchUser(otherAdmin, "{\"status\":\"suspended\"}", manager).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("user_role_forbidden"));
			perform(delete(BASE + "/" + otherAdmin), manager).andExpect(status().isForbidden());
			// ...nor give anyone the admin role.
			patchUser(user, "{\"userType\":\"admin\"}", manager).andExpect(status().isForbidden());
			// App users (role without permissions) are fine.
			patchUser(user, "{\"status\":\"suspended\"}", manager).andExpect(status().isOk());
			assertThat(column(otherAdmin, "status")).isEqualTo("active");
		}

		@Test
		void unknownUserIs404() throws Exception {
			patchUser(999, "{\"fullName\":\"Edited\"}", admin).andExpect(status().isNotFound());
		}

	}

	@Nested
	class Delete {

		@Test
		void softDeletesEndsSessionsAndKeepsTheEmailReserved() throws Exception {
			long user = account("app@example.com", "user", "active");
			String session = accessToken(login("app@example.com", PASSWORD));

			perform(delete(BASE + "/" + user), admin).andExpect(status().isNoContent());

			assertThat(column(user, "deleted_at")).isNotNull();
			getWithToken("/api/v1/auth/me", session).andExpect(status().isUnauthorized());
			perform(delete(BASE + "/" + user), admin).andExpect(status().isNotFound());
			perform(get(BASE + "/" + user), admin).andExpect(status().isNotFound());
			postUser(VALID.replace("Neha@Example.com", "app@example.com"), admin).andExpect(status().isConflict());
			assertThat(awaitLog("User: delete")).containsEntry("reference_id", user);
		}

		@Test
		void cannotDeleteYourself() throws Exception {
			perform(delete(BASE + "/1"), admin).andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("user_self_modification"));
			assertThat(column(1, "deleted_at")).isNull();
		}

	}

	@Nested
	class Permissions {

		private long target;

		@BeforeEach
		void createTarget() {
			target = account("app@example.com", "user", "active");
		}

		@Test
		void unauthenticatedIs401() throws Exception {
			mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
		}

		@Test
		void noUserPermissionsBlocksEverything() throws Exception {
			String staff = staff("nobody");
			for (MockHttpServletRequestBuilder request : everyEndpoint()) {
				perform(request, staff).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void viewOnlyCanListAndViewButNotWrite() throws Exception {
			String staff = staff("viewer", "list", "view");
			perform(get(BASE), staff).andExpect(status().isOk());
			perform(get(BASE + "/stats"), staff).andExpect(status().isOk());
			perform(get(BASE + "/roles"), staff).andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.slug == 'admin')].assignable").value(contains(false)));
			perform(get(BASE + "/" + target), staff).andExpect(status().isOk());
			postUser(VALID, staff).andExpect(status().isForbidden());
			patchUser(target, "{\"fullName\":\"Edited\"}", staff).andExpect(status().isForbidden());
			perform(delete(BASE + "/" + target), staff).andExpect(status().isForbidden());
			assertUnchanged();
		}

		@Test
		void listWithoutViewCannotOpenDetails() throws Exception {
			String staff = staff("lister", "list");
			perform(get(BASE), staff).andExpect(status().isOk());
			perform(get(BASE + "/" + target), staff).andExpect(status().isForbidden());
		}

		@Test
		void eachWritePermissionAllowsOnlyItsAction() throws Exception {
			String creator = staff("creator", "view", "create");
			postUser(VALID.replace("\"active\"", "\"pending\""), creator).andExpect(status().isCreated());
			patchUser(target, "{\"fullName\":\"Edited\"}", creator).andExpect(status().isForbidden());

			String editor = staff("editor", "view", "update");
			patchUser(target, "{\"fullName\":\"Edited\"}", editor).andExpect(status().isOk());
			perform(delete(BASE + "/" + target), editor).andExpect(status().isForbidden());

			String deleter = staff("deleter", "view", "delete");
			postUser(VALID.replace("Neha", "Other").replace("98765 11111", "98765 33333"), deleter)
				.andExpect(status().isForbidden());
			perform(delete(BASE + "/" + target), deleter).andExpect(status().isNoContent());
		}

		@Test
		void adminPanelAccessIsRequired() throws Exception {
			String staff = staff("editor", "list", "view", "create", "update", "change_status", "delete");
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");
			for (MockHttpServletRequestBuilder request : everyEndpoint()) {
				perform(request, staff).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void permissionsAreReadOnEveryRequest() throws Exception {
			String staff = staff("editor", "list", "view");
			perform(get(BASE), staff).andExpect(status().isOk());
			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			perform(get(BASE), staff).andExpect(status().isForbidden());
		}

		@Test
		void appUserTokenCannotUseAdminEndpoints() throws Exception {
			String appToken = accessToken(login("app@example.com", PASSWORD));
			perform(get(BASE), appToken).andExpect(status().isForbidden());
		}

		@Test
		void deniedRequestsAreLogged() throws Exception {
			perform(get(BASE), staff("nobody")).andExpect(status().isForbidden());
			assertThat(awaitLog("Access denied: User: list")).containsEntry("module", "permissions");
		}

		private List<MockHttpServletRequestBuilder> everyEndpoint() {
			return List.of(get(BASE), get(BASE + "/stats"), get(BASE + "/roles"), get(BASE + "/" + target),
					post(BASE).contentType(MediaType.APPLICATION_JSON).content(VALID),
					patch(BASE + "/" + target).contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"Edited\"}"),
					delete(BASE + "/" + target));
		}

		private void assertUnchanged() {
			assertThat(column(target, "full_name")).isEqualTo("Staff Member");
			assertThat(column(target, "deleted_at")).isNull();
			assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE email = 'neha@example.com'", Integer.class))
				.isZero();
		}

	}

	@Test
	void appRolesAreAssignableEvenWithAppPermissionsTheAdminLacks() throws Exception {
		// The seeded user role grants owner-scoped app permissions (own leads, properties, ...).
		jdbc.update("UPDATE roles SET permissions = permissions || '{\"secret\": {\"read\": true}}'::jsonb WHERE slug = 'user'");
		perform(get(BASE + "/roles"), admin)
			.andExpect(jsonPath("$[?(@.slug == 'user')].assignable").value(contains(true)));
		postUser(VALID, admin).andExpect(status().isCreated());
	}

	@Test
	void seededAdminRolesHoldEveryUserPermission() {
		for (String slug : List.of("admin", "super-admin")) {
			String permissions = jdbc.queryForObject("SELECT permissions -> 'user' FROM roles WHERE slug = ?",
					String.class, slug);
			assertThat(permissions).contains("\"list\": true", "\"view\": true", "\"create\": true", "\"update\": true",
					"\"change_status\": true", "\"delete\": true");
		}
		assertThat(jdbc.queryForObject("SELECT permissions ? 'user' FROM roles WHERE slug = 'user'", Boolean.class))
			.isFalse();
	}

	/** Two active app users, one pending, one inactive; distinct phone numbers sharing a prefix. */
	private void seed() {
		insertUser("Rohit Sharma", "rohit@example.com", "+919800000001", "active", "user");
		insertUser("Priya Mehta", "priya@example.com", "+919800000002", "pending", "user");
		insertUser("Aman Verma", "aman@example.com", "+919800000003", "active", "user");
		insertUser("Kavya Iyer", "kavya@example.com", null, "inactive", "admin");
	}

	private void insertUser(String name, String email, String phone, String status, String userType) {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, phone, status, user_type, created_at)
				VALUES (?, 'x', ?, ?, ?, ?, now() + (SELECT count(*) FROM users) * interval '1 second')""",
				email, name, phone, status, userType);
	}

	private String staff(String slug, String... userActions) throws Exception {
		String granted = String.join(", ", Arrays.stream(userActions).map(a -> "\"" + a + "\": true").toList());
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"user\": {" + granted + "}}");
		String email = slug + "@example.com";
		account(email, slug, "active");
		return adminToken(email);
	}

	/** An active (or other status), email-verified account; returns its id. */
	private long account(String email, String userType, String status) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Staff Member', ?, ?, now()) RETURNING id""",
				Long.class, email, passwordEncoder.encode(PASSWORD), status, userType);
	}

	private String adminToken(String email) throws Exception {
		return accessToken(postJson("/api/v1/admin/login",
				"{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)));
	}

	private ResultActions postUser(String json, String token) throws Exception {
		return perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions patchUser(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private int userCount() {
		return jdbc.queryForObject("SELECT count(*) FROM users", Integer.class);
	}

	private String column(long id, String name) {
		return jdbc.queryForObject("SELECT " + name + "::text FROM users WHERE id = ?", String.class, id);
	}

	private Map<String, Object> awaitLog(String action) {
		List<Map<String, Object>> rows = await().atMost(Duration.ofSeconds(5))
			.until(() -> jdbc.queryForList("""
					SELECT user_id, module, reference_id, additional_data::text AS data
					FROM system_logs WHERE action = ? ORDER BY id DESC""", action), found -> !found.isEmpty());
		return rows.get(0);
	}

}
