package com.propertypro.property_platform.propertyview;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Recently viewed and the owner's engagement numbers through real logins and the seeded user role. */
class RecentlyViewedAndEngagementApiTests extends AbstractIntegrationTest {

	private static final String RECENT = "/api/v1/recently-viewed";
	private static final String PROPERTIES = "/api/v1/properties";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String alice;
	private String bob;
	private String owner;
	private long ownerId;
	private long first;
	private long second;
	private long draft;

	@BeforeEach
	void setUp() throws Exception {
		originalRoles = jdbc.queryForList("SELECT slug, permissions::text AS permissions FROM roles WHERE slug = 'user'");
		ownerId = account("owner@example.com");
		account("alice@example.com");
		account("bob@example.com");
		alice = login("alice@example.com");
		bob = login("bob@example.com");
		owner = login("owner@example.com");
		first = property("green-acres", "published");
		second = property("blue-hills", "published");
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
		mvc.perform(get(RECENT)).andExpect(status().isUnauthorized());
		mvc.perform(post(RECENT + "/" + first)).andExpect(status().isUnauthorized());
		mvc.perform(delete(RECENT)).andExpect(status().isUnauthorized());
		mvc.perform(get(PROPERTIES + "/engagement")).andExpect(status().isUnauthorized());
		mvc.perform(get(PROPERTIES + "/" + first + "/engagement")).andExpect(status().isUnauthorized());
	}

	@Test
	void viewsAreCountedOncePerPairAndListedMostRecentFirst() throws Exception {
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());
		withToken(post(RECENT + "/" + second), alice).andExpect(status().isNoContent());
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());

		getWithToken(RECENT, alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].id", contains((int) first, (int) second)));
		assertThat(rows()).isEqualTo(2);
		assertThat(jdbc.queryForObject("SELECT view_count FROM property_views WHERE property_id = ?", Integer.class,
				first)).isEqualTo(2);
	}

	@Test
	void onlyPublishedPropertiesCanBeViewed() throws Exception {
		withToken(post(RECENT + "/" + draft), alice).andExpect(status().isNotFound());
		withToken(post(RECENT + "/99999"), alice).andExpect(status().isNotFound());
		withToken(post(RECENT + "/0"), alice).andExpect(status().isBadRequest());
		assertThat(rows()).isZero();
	}

	@Test
	void historyIsPrivateAndCanBeCleared() throws Exception {
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());

		getWithToken(RECENT, bob).andExpect(jsonPath("$", hasSize(0)));
		withToken(delete(RECENT), bob).andExpect(status().isNoContent());
		assertThat(rows()).isOne();

		withToken(delete(RECENT), alice).andExpect(status().isNoContent());
		getWithToken(RECENT, alice).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void ownersSeeTheEngagementOfTheirOwnProperties() throws Exception {
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());
		withToken(post(RECENT + "/" + first), bob).andExpect(status().isNoContent());
		withToken(post(RECENT + "/" + second), bob).andExpect(status().isNoContent());
		withToken(put("/api/v1/saved-properties/" + first), alice).andExpect(status().isNoContent());

		getWithToken(PROPERTIES + "/" + first + "/engagement", owner)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.views").value(3))
			.andExpect(jsonPath("$.uniqueViewers").value(2))
			.andExpect(jsonPath("$.saves").value(1));
		getWithToken(PROPERTIES + "/engagement", owner)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.views").value(4))
			.andExpect(jsonPath("$.uniqueViewers").value(3))
			.andExpect(jsonPath("$.saves").value(1));
	}

	@Test
	void nobodyElseSeesAnotherOwnersNumbers() throws Exception {
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isNoContent());

		getWithToken(PROPERTIES + "/" + first + "/engagement", bob).andExpect(status().isNotFound());
		getWithToken(PROPERTIES + "/engagement", bob)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.views").value(0));
	}

	@Test
	void missingPermissionsAreForbidden() throws Exception {
		jdbc.update("UPDATE roles SET permissions = permissions - 'recently_viewed' WHERE slug = 'user'");

		getWithToken(RECENT, alice).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("recently_viewed_action_forbidden"));
		withToken(post(RECENT + "/" + first), alice).andExpect(status().isForbidden());
		withToken(delete(RECENT), alice).andExpect(status().isForbidden());
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
		return jdbc.queryForObject("SELECT count(*) FROM property_views", Integer.class);
	}

}
