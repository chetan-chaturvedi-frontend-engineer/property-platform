package com.propertypro.property_platform.user.api;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The caller's own account through real logins and the seeded user role. */
class UserProfileApiTests extends AbstractIntegrationTest {

	private static final String ME = "/api/v1/users/me";
	private static final String NEW_PASSWORD = "Another!Pass9";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private long aliceId;
	private long bobId;
	private String alice;
	private String bob;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		aliceId = account("alice@example.com");
		bobId = account("bob@example.com");
		alice = signIn("alice@example.com", PASSWORD);
		bob = signIn("bob@example.com", PASSWORD);
	}

	@AfterEach
	void restoreRoles() {
		originalRoles.forEach(role -> jdbc.update("UPDATE roles SET permissions = ?::jsonb WHERE slug = ?",
				role.get("permissions"), role.get("slug")));
		// Leaves no properties, subscriptions or notifications behind for classes that do not clean up themselves.
		jdbc.execute("TRUNCATE system_logs, users RESTART IDENTITY CASCADE");
	}

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(patch(ME).contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"New Name\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(post(ME + "/change-password").contentType(MediaType.APPLICATION_JSON).content(passwordBody(PASSWORD)))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(ME).contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"x\"}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void renamingChangesOnlyTheCallersName() throws Exception {
		send(patch(ME), alice, "{\"fullName\":\"  Alice Kumar \"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.fullName").value("Alice Kumar"))
			.andExpect(jsonPath("$.email").value("alice@example.com"));

		assertThat(nameOf(aliceId)).isEqualTo("Alice Kumar");
		assertThat(nameOf(bobId)).isEqualTo("Test");
	}

	@Test
	void invalidNamesAndUnknownFieldsAreRejected() throws Exception {
		send(patch(ME), alice, "{\"fullName\":\" \"}").andExpect(status().isBadRequest());
		send(patch(ME), alice, "{\"fullName\":\"A\"}").andExpect(status().isBadRequest());
		send(patch(ME), alice, "{\"fullName\":\"Alice\",\"email\":\"x@example.com\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.email").exists());
		assertThat(nameOf(aliceId)).isEqualTo("Test");
	}

	@Test
	void changingThePasswordEndsEverySessionAndTheNewPasswordWorks() throws Exception {
		send(post(ME + "/change-password"), alice, passwordBody(PASSWORD)).andExpect(status().isNoContent());

		getWithToken("/api/v1/auth/me", alice).andExpect(status().isUnauthorized());
		postJson("/api/v1/auth/login", "{\"identifier\":\"alice@example.com\",\"password\":\"%s\"}".formatted(PASSWORD))
			.andExpect(status().isUnauthorized());
		assertThat(signIn("alice@example.com", NEW_PASSWORD)).isNotBlank();
	}

	@Test
	void passwordChangesNeedTheCurrentPasswordAndAStrongDifferentOne() throws Exception {
		send(post(ME + "/change-password"), alice, passwordBody("Wrong!Pass1"))
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("password_incorrect"));
		send(post(ME + "/change-password"), alice,
				"{\"currentPassword\":\"%s\",\"password\":\"%s\",\"passwordConfirmation\":\"%s\"}".formatted(PASSWORD,
						PASSWORD, PASSWORD))
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("password_unchanged"));
		send(post(ME + "/change-password"), alice,
				"{\"currentPassword\":\"%s\",\"password\":\"weak\",\"passwordConfirmation\":\"weak\"}".formatted(PASSWORD))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.password").exists());
		send(post(ME + "/change-password"), alice,
				"{\"currentPassword\":\"%s\",\"password\":\"%s\",\"passwordConfirmation\":\"Different!Pass9\"}"
					.formatted(PASSWORD, NEW_PASSWORD))
			.andExpect(status().isBadRequest());

		getWithToken("/api/v1/auth/me", alice).andExpect(status().isOk());
	}

	@Test
	void deletingTheAccountEndsSessionsArchivesPropertiesAndKeepsOthersUntouched() throws Exception {
		long alicePublished = property(aliceId, "alice-published", "published");
		long aliceDraft = property(aliceId, "alice-draft", "draft");
		long bobPublished = property(bobId, "bob-published", "published");

		send(delete(ME), alice, "{\"password\":\"%s\"}".formatted(PASSWORD)).andExpect(status().isNoContent());

		getWithToken("/api/v1/auth/me", alice).andExpect(status().isUnauthorized());
		postJson("/api/v1/auth/login", "{\"identifier\":\"alice@example.com\",\"password\":\"%s\"}".formatted(PASSWORD))
			.andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM users WHERE id = ?", Boolean.class, aliceId))
			.isTrue();
		assertThat(statusOf(alicePublished)).isEqualTo("archived");
		assertThat(statusOf(aliceDraft)).isEqualTo("archived");
		assertThat(statusOf(bobPublished)).isEqualTo("published");
		mvc.perform(get("/api/v1/public/properties"))
			.andExpect(jsonPath("$.content", hasSize(1)))
			.andExpect(jsonPath("$.content[0].slug").value("bob-published"));
		getWithToken("/api/v1/auth/me", bob).andExpect(status().isOk());
	}

	@Test
	void deletionNeedsTheRightPassword() throws Exception {
		send(delete(ME), alice, "{\"password\":\"Wrong!Pass1\"}")
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.code").value("password_incorrect"));
		send(delete(ME), alice, "{}").andExpect(status().isBadRequest());

		getWithToken("/api/v1/auth/me", alice).andExpect(status().isOk());
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM users WHERE id = ?", Boolean.class, aliceId))
			.isTrue();
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		jdbc.update("UPDATE roles SET permissions = permissions - 'profile' WHERE slug = 'user'");

		send(patch(ME), alice, "{\"fullName\":\"New Name\"}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("profile_action_forbidden"));
		send(post(ME + "/change-password"), alice, passwordBody(PASSWORD)).andExpect(status().isForbidden());
		send(delete(ME), alice, "{\"password\":\"%s\"}".formatted(PASSWORD)).andExpect(status().isForbidden());
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NULL FROM users WHERE id = ?", Boolean.class, aliceId))
			.isTrue();
	}

	private static String passwordBody(String current) {
		return "{\"currentPassword\":\"%s\",\"password\":\"%s\",\"passwordConfirmation\":\"%s\"}".formatted(current,
				NEW_PASSWORD, NEW_PASSWORD);
	}

	private long account(String email) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', 'user', now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD));
	}

	private String signIn(String email, String password) throws Exception {
		return accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
	}

	private long property(long ownerId, String slug, String publicationStatus) {
		return jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
					project_email, project_phone, city, publication_status, published_at)
				VALUES (?, ?, 'apartment', ?, 'Builder', 'sales@example.com', '+919999999999', 'Pune', ?,
					CASE WHEN ? = 'published' THEN now() END) RETURNING id""", Long.class, ownerId, slug, slug,
				publicationStatus, publicationStatus);
	}

	private String statusOf(long propertyId) {
		return jdbc.queryForObject("SELECT publication_status FROM property_projects WHERE id = ?", String.class,
				propertyId);
	}

	private String nameOf(long userId) {
		return jdbc.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, userId);
	}

	private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

}
