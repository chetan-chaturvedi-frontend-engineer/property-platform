package com.propertypro.property_platform.builderteam.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin dashboard builder teams: every team, _ANY permissions and capability codes, no subscription gating. */
class BuilderTeamAdminApiTests extends BuilderTeamApiTestSupport {

	private String create(long builderId, long employeeId, String extra) {
		return """
				{"builderId": %d, "employeeId": %d, "role": "sales-executive"%s}"""
			.formatted(builderId, employeeId, extra.isEmpty() ? "" : ", " + extra);
	}

	@Test
	void unauthenticatedAndAppUsersAreRejected() throws Exception {
		mvc.perform(get(ADMIN)).andExpect(status().isUnauthorized());
		// With a valid CSRF token (without one, the CSRF check answers 403 first).
		mvc.perform(withCsrf(post(ADMIN)).contentType(MediaType.APPLICATION_JSON).content(create(bobId, aliceId, "")))
			.andExpect(status().isUnauthorized());
		getAs(ADMIN, bob).andExpect(status().isForbidden());
		postAs(ADMIN, bob, create(bobId, aliceId, "")).andExpect(status().isForbidden());
		assertThat(count("SELECT count(*) FROM builder_teams")).isZero();
	}

	@Test
	void adminManagesAnyTeamWithoutSubscriptionGating() throws Exception {
		long id = id(postAs(ADMIN, admin, create(bobId, aliceId,
				"\"status\": \"active\", \"permissions\": {\"lead\": {\"view\": true}}, \"notes\": \"onboarded\""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.builder.id").value(bobId))
			.andExpect(jsonPath("$.builder.email").value("bob@example.com"))
			.andExpect(jsonPath("$.employee.email").value("alice@example.com"))
			.andExpect(jsonPath("$.invitedBy.id").value(adminId))
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.joinedAt").isNotEmpty())
			.andExpect(jsonPath("$.permissions.lead.view").value(true))
			.andExpect(jsonPath("$.notes").value("onboarded")));
		long pending = id(postAs(ADMIN, admin, create(carolId, daveId, "")).andExpect(status().isCreated()));
		assertThat(column(id, "user_id")).isEqualTo(String.valueOf(adminId));

		getAs(ADMIN, admin).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
		getAs(ADMIN + "?builderId=" + carolId, admin).andExpect(jsonPath("$.content[*].id",
				containsInAnyOrder((int) pending)));
		getAs(ADMIN + "?employeeId=" + aliceId + "&status=active", admin).andExpect(jsonPath("$.content[*].id",
				containsInAnyOrder((int) id)));
		getAs(ADMIN + "?search=dave", admin).andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) pending)));
		getAs(ADMIN + "?createdFrom=2999-01-01T00:00:00Z", admin).andExpect(jsonPath("$.totalElements").value(0));
		getAs(ADMIN + "?createdFrom=2026-02-01T00:00:00Z&createdTo=2026-01-01T00:00:00Z", admin)
			.andExpect(status().isBadRequest());
		getAs(ADMIN + "/" + id, admin).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));

		patchAs(ADMIN + "/" + pending, admin, "{\"status\": \"active\", \"role\": \"user\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.role").value("user"));
		patchAs(ADMIN + "/" + id, admin, "{\"permissions\": {}, \"status\": \"inactive\", \"notes\": null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("inactive"))
			.andExpect(jsonPath("$.permissions").isEmpty())
			.andExpect(jsonPath("$.notes").value(nullValue()));

		deleteAs(ADMIN + "/" + id, admin).andExpect(status().isNoContent());
		getAs(ADMIN + "/" + id, admin).andExpect(status().isNotFound());
		getAs(ADMIN, admin).andExpect(jsonPath("$.totalElements").value(1));
		assertThat(column(id, "deleted_at")).isNotNull();
		assertThat(count("SELECT count(*) FROM user_subscriptions")).isZero();
	}

	@Test
	void adminCreationIsValidated() throws Exception {
		role("staff", "{\"admin_panel\": {\"access\": true}}");
		long staff = account("staff@example.com", "staff");
		postAs(ADMIN, admin, create(bobId, aliceId, "")).andExpect(status().isCreated());

		postAs(ADMIN, admin, create(bobId, aliceId, ""))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("builder_team_duplicate_membership"));
		postAs(ADMIN, admin, create(bobId, bobId, "")).andExpect(status().isUnprocessableContent());
		postAs(ADMIN, admin, create(staff, daveId, ""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.builderId").exists());
		postAs(ADMIN, admin, create(999_999, daveId, ""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.builderId").exists());
		postAs(ADMIN, admin, create(bobId, 999_999, ""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.employeeId").exists());
		postAs(ADMIN, admin, create(bobId, staff, ""))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.employeeId").exists());
		// Never more than the builder holds, even when the admin holds it.
		postAs(ADMIN, admin, create(bobId, daveId, "\"permissions\": {\"lead\": {\"view_any\": true}}"))
			.andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.permissions").exists());
		postAs(ADMIN, admin, create(bobId, daveId, "\"status\": \"revoked\"")).andExpect(status().isBadRequest());
		postAs(ADMIN, admin, create(bobId, daveId, "\"userId\": 1")).andExpect(status().isBadRequest());
		assertThat(count("SELECT count(*) FROM builder_teams")).isOne();
	}

	@Test
	void adminsWithoutTheRequiredPermissionAreForbidden() throws Exception {
		role("team-viewer", "{\"admin_panel\": {\"access\": true}, \"builder_team\": {\"list_any\": true, "
				+ "\"create_any\": true, \"update_any\": true}}");
		account("viewer@example.com", "team-viewer");
		String viewer = token("viewer@example.com");
		long id = member(bobId, aliceId, "active");

		getAs(ADMIN, viewer).andExpect(status().isOk());
		getAs(ADMIN + "/" + id, viewer).andExpect(status().isForbidden());
		deleteAs(ADMIN + "/" + id, viewer).andExpect(status().isForbidden());
		postAs(ADMIN, viewer, create(bobId, daveId, "\"status\": \"active\"")).andExpect(status().isForbidden());
		postAs(ADMIN, viewer, create(bobId, daveId, "\"permissions\": {\"lead\": {\"view\": true}}"))
			.andExpect(status().isForbidden());
		patchAs(ADMIN + "/" + id, viewer, "{\"role\": \"user\", \"permissions\": {}, \"status\": \"revoked\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.fields", containsInAnyOrder("permissions", "role", "status")));
		patchAs(ADMIN + "/" + id, viewer, "{\"notes\": \"checked\"}").andExpect(status().isOk());
		assertThat(column(id, "status")).isEqualTo("active");
		assertThat(column(id, "deleted_at")).isNull();
	}

}
