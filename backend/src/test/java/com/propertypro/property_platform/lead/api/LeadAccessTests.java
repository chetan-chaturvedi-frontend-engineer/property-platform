package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Authentication, permissions, ownership, assignment and deletion of leads. */
class LeadAccessTests extends LeadApiTestSupport {

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		long leadId = createLead(alice);

		mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(LEAD)).andExpect(status().isUnauthorized());
		mvc.perform(get(BASE + "/" + leadId)).andExpect(status().isUnauthorized());
		mvc.perform(patch(BASE + "/" + leadId).contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(BASE + "/" + leadId)).andExpect(status().isUnauthorized());
		mvc.perform(get(BASE + "/" + leadId + "/schedules")).andExpect(status().isUnauthorized());
		mvc.perform(get(BASE + "/" + leadId + "/interactions")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/admin/leads")).andExpect(status().isUnauthorized());
		getAs(BASE, "not-a-token").andExpect(status().isUnauthorized());
	}

	@Test
	void createSetsTheCreatorFromTheTokenAndServerDefaults() throws Exception {
		postAs(BASE, alice, LEAD)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.createdBy.id").value(aliceId))
			.andExpect(jsonPath("$.createdBy.fullName").value("alice"))
			.andExpect(jsonPath("$.createdBy.email").doesNotExist())
			.andExpect(jsonPath("$.assignedTo").value(nullValue()))
			.andExpect(jsonPath("$.status").value("new"))
			.andExpect(jsonPath("$.priority").value("medium"))
			.andExpect(jsonPath("$.source").value("other"))
			.andExpect(jsonPath("$.budgetCurrency").value("INR"))
			.andExpect(jsonPath("$.phone").value(PHONE_E164))
			.andExpect(jsonPath("$.lastContactedAt").value(nullValue()));
	}

	@ParameterizedTest
	@ValueSource(strings = { "\"createdBy\": 999", "\"id\": 5", "\"lastContactedAt\": \"2026-01-01T00:00:00Z\"",
			"\"createdAt\": \"2026-01-01T00:00:00Z\"", "\"deletedAt\": null", "\"userId\": 1" })
	void protectedFieldsCannotBeSetOnCreate(String field) throws Exception {
		postAs(BASE, alice, LEAD.replace("{", "{" + field + ", "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.*").value("is not allowed"));
		assertThat(count("SELECT count(*) FROM leads")).isZero();
	}

	@ParameterizedTest
	@ValueSource(strings = { "{\"createdBy\": " + Long.MAX_VALUE + "}", "{\"assignedTo\": 1}", "{\"id\": 77}",
			"{\"updatedAt\": \"2026-01-01T00:00:00Z\"}", "{\"lastContactedAt\": null}" })
	void protectedFieldsCannotBeChangedOnUpdate(String body) throws Exception {
		long leadId = createLead(alice);

		patchAs(BASE + "/" + leadId, alice, body).andExpect(status().isBadRequest());
		patchAs(BASE + "/" + leadId, admin, body).andExpect(status().isBadRequest());
		assertThat(column("leads", leadId, "created_by")).isEqualTo(String.valueOf(aliceId));
		assertThat(column("leads", leadId, "assigned_to")).isNull();
	}

	@Test
	void usersListOnlyTheirOwnLeadsAndFiltersCannotWidenTheScope() throws Exception {
		createLead(alice);
		createLead(alice, LEAD.replace("Ravi Kumar", "Asha"));
		createLead(bob);

		getAs(BASE, alice).andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.content[*].leadName").value(containsInAnyOrder("Ravi Kumar", "Asha")));
		getAs(BASE + "?createdBy=" + bobId, alice).andExpect(jsonPath("$.totalElements").value(0));
		getAs(BASE + "?search=Ravi", bob).andExpect(jsonPath("$.totalElements").value(1));
		getAs(BASE, admin).andExpect(jsonPath("$.totalElements").value(3));
		getAs("/api/v1/admin/leads?createdBy=" + aliceId, admin).andExpect(jsonPath("$.totalElements").value(2));
	}

	@Test
	void anotherUsersLeadIsNotFoundForEveryAction() throws Exception {
		long bobsLead = createLead(bob);
		String path = BASE + "/" + bobsLead;

		getAs(path, alice).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("lead_not_found"));
		patchAs(path, alice, "{\"leadName\":\"Hijacked\"}").andExpect(status().isNotFound());
		deleteAs(path, alice).andExpect(status().isNotFound());
		getAs(path + "/schedules", alice).andExpect(status().isNotFound());
		postAs(path + "/schedules", alice, """
				{"scheduleType":"call","title":"Call","scheduledAt":"2026-11-01T10:00:00Z"}""")
			.andExpect(status().isNotFound());
		getAs(path + "/interactions", alice).andExpect(status().isNotFound());
		postAs(path + "/interactions", alice, """
				{"type":"call","interactionAt":"2026-10-01T10:00:00Z"}""").andExpect(status().isNotFound());
		// An id that does not exist looks the same.
		getAs(BASE + "/999999", alice).andExpect(status().isNotFound());
		assertThat(column("leads", bobsLead, "lead_name")).isEqualTo("Ravi Kumar");
		assertThat(count("SELECT count(*) FROM lead_schedules")).isZero();
	}

	@Test
	void adminCanViewUpdateAndDeleteAnyLead() throws Exception {
		long leadId = createLead(alice);

		getAs(BASE + "/" + leadId, admin).andExpect(status().isOk());
		patchAs(BASE + "/" + leadId, admin, "{\"priority\":\"urgent\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.priority").value("urgent"))
			.andExpect(jsonPath("$.createdBy.id").value(aliceId));
		deleteAs(BASE + "/" + leadId, admin).andExpect(status().isNoContent());
		getAs(BASE + "/" + leadId, alice).andExpect(status().isNotFound());
	}

	@Test
	void adminListNeedsAdminPanelAccessAndListAny() throws Exception {
		getAs("/api/v1/admin/leads", alice).andExpect(status().isForbidden());
		getAs("/api/v1/admin/leads", admin).andExpect(status().isOk());

		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead,list_any}' WHERE slug = 'admin'");
		getAs("/api/v1/admin/leads", admin).andExpect(status().isForbidden());
	}

	@Test
	void aCustomRoleGetsExactlyTheLeadPermissionsItIsGranted() throws Exception {
		role("lead-auditor", "\"lead\": {\"list_any\": true, \"view_any\": true}");
		account("auditor@example.com", "lead-auditor");
		String auditor = token("auditor@example.com");
		long leadId = createLead(bob);

		getAs(BASE, auditor).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
		getAs("/api/v1/admin/leads", auditor).andExpect(status().isOk());
		getAs(BASE + "/" + leadId, auditor).andExpect(status().isOk());
		// Visible, but not editable: 403 rather than 404.
		patchAs(BASE + "/" + leadId, auditor, "{\"priority\":\"high\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("lead_action_forbidden"));
		deleteAs(BASE + "/" + leadId, auditor).andExpect(status().isForbidden());
		postAs(BASE, auditor, LEAD).andExpect(status().isForbidden());
		patchAs(BASE + "/" + leadId + "/assign", auditor, "{\"assignedTo\":null}").andExpect(status().isForbidden());
		getAs(BASE + "/" + leadId + "/schedules", auditor).andExpect(status().isForbidden());
		assertThat(column("leads", leadId, "priority")).isEqualTo("medium");
	}

	@Test
	void aRoleWithoutLeadPermissionsIsDenied() throws Exception {
		role("guest", "");
		account("guest@example.com", "guest");
		String guest = token("guest@example.com");
		long aliceLead = createLead(alice);

		postAs(BASE, guest, LEAD).andExpect(status().isForbidden());
		getAs(BASE, guest).andExpect(status().isForbidden());
		getAs("/api/v1/admin/leads", guest).andExpect(status().isForbidden());
		getAs(BASE + "/" + aliceLead, guest).andExpect(status().isNotFound());
	}

	@Test
	void revokingAPermissionTakesEffectOnTheNextRequest() throws Exception {
		long leadId = createLead(alice);
		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead,update}' WHERE slug = 'user'");

		getAs(BASE + "/" + leadId, alice).andExpect(status().isOk());
		patchAs(BASE + "/" + leadId, alice, "{\"priority\":\"high\"}").andExpect(status().isForbidden());
	}

	@Test
	void onlyLeadAssignHoldersAssign() throws Exception {
		long leadId = createLead(alice);

		patchAs(BASE + "/" + leadId + "/assign", alice, "{\"assignedTo\":" + adminId + "}")
			.andExpect(status().isForbidden());
		postAs(BASE, alice, LEAD.replace("{", "{\"assignedTo\": " + adminId + ", "))
			.andExpect(status().isForbidden());
		assertThat(count("SELECT count(*) FROM leads")).isOne();

		patchAs(BASE + "/" + leadId + "/assign", admin, "{\"assignedTo\":" + adminId + "}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignedTo.id").value(adminId));
		patchAs(BASE + "/" + leadId + "/assign", admin, "{\"assignedTo\":null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignedTo").value(nullValue()));
		postAs(BASE, admin, LEAD.replace("{", "{\"assignedTo\": " + adminId + ", "))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.createdBy.id").value(adminId))
			.andExpect(jsonPath("$.assignedTo.id").value(adminId));
	}

	@Test
	void assigneesMustBeActiveUsersWhoCanSeeTheLead() throws Exception {
		long leadId = createLead(alice);
		String assign = BASE + "/" + leadId + "/assign";

		// Bob is a regular user: he could never open Alice's lead.
		patchAs(assign, admin, "{\"assignedTo\":" + bobId + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.assignedTo").value("must be an active user who can work on this lead"));
		patchAs(assign, admin, "{\"assignedTo\":999999}").andExpect(status().isBadRequest());
		patchAs(assign, admin, "{\"assignedTo\":-1}").andExpect(status().isBadRequest());
		patchAs(assign, admin, "{\"assignedTo\":\"abc\"}").andExpect(status().isBadRequest());
		long otherAdmin = account("admin2@example.com", "admin");
		jdbc.update("UPDATE users SET status = 'suspended' WHERE id = ?", otherAdmin);
		patchAs(assign, admin, "{\"assignedTo\":" + otherAdmin + "}").andExpect(status().isBadRequest());
		// The creator can always be the assignee.
		patchAs(assign, admin, "{\"assignedTo\":" + aliceId + "}").andExpect(status().isOk());
		assertThat(column("leads", leadId, "assigned_to")).isEqualTo(String.valueOf(aliceId));
	}

	@Test
	void assignedAccessIsAnExplicitPermission() throws Exception {
		role("sales-agent", """
				"lead": {"list": true, "view": true, "update": true, "delete": true, "access_assigned": true},
				"lead_interaction": {"view": true, "create": true}""");
		long agentId = account("agent@example.com", "sales-agent");
		String agent = token("agent@example.com");
		long leadId = createLead(alice);

		getAs(BASE + "/" + leadId, agent).andExpect(status().isNotFound());
		patchAs(BASE + "/" + leadId + "/assign", admin, "{\"assignedTo\":" + agentId + "}").andExpect(status().isOk());

		getAs(BASE, agent).andExpect(jsonPath("$.totalElements").value(1));
		getAs(BASE + "/" + leadId, agent).andExpect(status().isOk());
		patchAs(BASE + "/" + leadId, agent, "{\"status\":\"contacted\"}").andExpect(status().isOk());
		postAs(BASE + "/" + leadId + "/interactions", agent, """
				{"type":"call","interactionAt":"2026-10-01T10:00:00Z"}""")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.interactedBy.id").value(agentId));
		// Only the creator deletes with the owner-level permission.
		deleteAs(BASE + "/" + leadId, agent).andExpect(status().isForbidden());

		// Without the permission, assignment alone grants nothing.
		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead,access_assigned}' WHERE slug = 'sales-agent'");
		getAs(BASE + "/" + leadId, agent).andExpect(status().isNotFound());
		getAs(BASE, agent).andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void deletionIsSoftAndKeepsHistory() throws Exception {
		long leadId = createLead(alice);
		createSchedule(leadId, alice, """
				{"scheduleType":"call","title":"Call","scheduledAt":"2026-11-01T10:00:00Z"}""");
		createInteraction(leadId, alice, """
				{"type":"call","interactionAt":"2026-10-01T10:00:00Z"}""");

		deleteAs(BASE + "/" + leadId, bob).andExpect(status().isNotFound());
		deleteAs(BASE + "/" + leadId, alice).andExpect(status().isNoContent());

		assertThat(column("leads", leadId, "deleted_at")).isNotNull();
		assertThat(count("SELECT count(*) FROM lead_schedules WHERE lead_id = ? AND deleted_at IS NULL", leadId)).isOne();
		assertThat(count("SELECT count(*) FROM lead_interactions WHERE lead_id = ? AND deleted_at IS NULL", leadId))
			.isOne();
		getAs(BASE + "/" + leadId, admin).andExpect(status().isNotFound());
		getAs(BASE + "/" + leadId + "/schedules", alice).andExpect(status().isNotFound());
		getAs(BASE, alice).andExpect(jsonPath("$.totalElements").value(0));
		deleteAs(BASE + "/" + leadId, alice).andExpect(status().isNotFound());
	}

	@Test
	void realLoginsUseTheSeededRolePermissions() throws Exception {
		assertThat(jdbc.queryForObject("SELECT (permissions -> 'lead_schedule')::text FROM roles WHERE slug = 'user'",
				String.class)).contains("\"create\": true");
		assertThat(jdbc.queryForObject("SELECT (permissions -> 'lead')::text FROM roles WHERE slug = 'admin'",
				String.class)).contains("\"assign\": true", "\"create\": true", "\"view_any\": true");
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions -> 'lead' ? 'access_assigned'",
				String.class)).isEmpty();
	}

	@Test
	void writesAreRateLimitedPerUser() throws Exception {
		for (int i = 0; i < 25; i++) {
			postAs(BASE, alice, LEAD).andExpect(status().isCreated());
		}
		postAs(BASE, alice, LEAD)
			.andExpect(status().isTooManyRequests())
			.andExpect(header().exists("Retry-After"));
		// Counted per user.
		postAs(BASE, bob, LEAD).andExpect(status().isCreated());
	}

}
