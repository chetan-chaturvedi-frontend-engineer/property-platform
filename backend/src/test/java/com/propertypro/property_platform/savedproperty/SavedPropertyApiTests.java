package com.propertypro.property_platform.savedproperty;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The caller's shortlist through real logins and the seeded user role. */
class SavedPropertyApiTests extends AbstractIntegrationTest {

	private static final String SAVED = "/api/v1/saved-properties";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String alice;
	private String bob;
	private long ownerId;
	private long published;
	private long secondPublished;
	private long draft;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		ownerId = account("owner@example.com");
		account("alice@example.com");
		account("bob@example.com");
		alice = login("alice@example.com");
		bob = login("bob@example.com");
		published = property("green-acres", "published");
		secondPublished = property("blue-hills", "published");
		draft = property("grey-draft", "draft");
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
		mvc.perform(get(SAVED)).andExpect(status().isUnauthorized());
		mvc.perform(get(SAVED + "/ids")).andExpect(status().isUnauthorized());
		mvc.perform(put(SAVED + "/" + published)).andExpect(status().isUnauthorized());
		mvc.perform(delete(SAVED + "/" + published)).andExpect(status().isUnauthorized());
	}

	@Test
	void savingShowsThePropertyOnTheShortlistNewestFirst() throws Exception {
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		withToken(put(SAVED + "/" + secondPublished), alice).andExpect(status().isNoContent());

		getWithToken(SAVED, alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].id", contains((int) secondPublished, (int) published)))
			.andExpect(jsonPath("$.content[0].slug").value("blue-hills"))
			.andExpect(jsonPath("$.totalElements").value(2));
		getWithToken(SAVED + "/ids", alice).andExpect(jsonPath("$", contains((int) secondPublished, (int) published)));
	}

	@Test
	void savingTwiceKeepsOneRowAndRemovingIsIdempotent() throws Exception {
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		assertThat(rows()).isOne();

		withToken(delete(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		withToken(delete(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		assertThat(rows()).isZero();
		getWithToken(SAVED, alice).andExpect(jsonPath("$.content", hasSize(0)));
	}

	@Test
	void onlyPublishedPropertiesCanBeSaved() throws Exception {
		withToken(put(SAVED + "/" + draft), alice).andExpect(status().isNotFound());
		withToken(put(SAVED + "/99999"), alice).andExpect(status().isNotFound());
		withToken(put(SAVED + "/0"), alice).andExpect(status().isBadRequest());
		assertThat(rows()).isZero();
	}

	@Test
	void aPropertyThatIsNoLongerPublicLeavesTheShortlistButKeepsItsRow() throws Exception {
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isNoContent());
		jdbc.update("UPDATE property_projects SET publication_status = 'suspended' WHERE id = ?", published);

		getWithToken(SAVED, alice).andExpect(jsonPath("$.content", hasSize(0)));
		assertThat(rows()).isOne();
	}

	@Test
	void usersNeverSeeAnotherUsersShortlist() throws Exception {
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isNoContent());

		getWithToken(SAVED, bob).andExpect(jsonPath("$.content", hasSize(0)));
		getWithToken(SAVED + "/ids", bob).andExpect(jsonPath("$", hasSize(0)));
		withToken(delete(SAVED + "/" + published), bob).andExpect(status().isNoContent());
		assertThat(rows()).isOne();
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		jdbc.update("UPDATE roles SET permissions = permissions - 'saved_property' WHERE slug = 'user'");

		getWithToken(SAVED, alice).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("saved_property_action_forbidden"));
		getWithToken(SAVED + "/ids", alice).andExpect(status().isForbidden());
		withToken(put(SAVED + "/" + published), alice).andExpect(status().isForbidden());
		withToken(delete(SAVED + "/" + published), alice).andExpect(status().isForbidden());
	}

	private ResultActions withToken(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private long account(String email) {
		return jdbc.queryForObject("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Test', 'active', 'user', now()) RETURNING id""", Long.class, email,
				passwordEncoder.encode(PASSWORD));
	}

	private String login(String email) throws Exception {
		return accessToken(postJson("/api/v1/auth/login",
				"{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)));
	}

	private long property(String slug, String publicationStatus) {
		return jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
					project_email, project_phone, city, publication_status, published_at)
				VALUES (?, ?, 'apartment', ?, 'Builder', 'sales@example.com', '+919999999999', 'Pune', ?,
					CASE WHEN ? = 'published' THEN now() END) RETURNING id""", Long.class, ownerId, slug, slug,
				publicationStatus, publicationStatus);
	}

	private int rows() {
		return jdbc.queryForObject("SELECT count(*) FROM saved_properties", Integer.class);
	}

}
