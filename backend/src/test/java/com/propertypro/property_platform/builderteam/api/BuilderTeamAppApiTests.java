package com.propertypro.property_platform.builderteam.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Mobile app builder teams: the builder's own team, subscription gating, grants and the employee side. */
class BuilderTeamAppApiTests extends BuilderTeamApiTestSupport {

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(APP)).andExpect(status().isUnauthorized());
		mvc.perform(post(APP).contentType(MediaType.APPLICATION_JSON).content(invitation("alice@example.com")))
			.andExpect(status().isUnauthorized());
		mvc.perform(get(APP + "/1")).andExpect(status().isUnauthorized());
		mvc.perform(patch(APP + "/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(APP + "/1")).andExpect(status().isUnauthorized());
		mvc.perform(get(MEMBERSHIPS)).andExpect(status().isUnauthorized());
		mvc.perform(post(MEMBERSHIPS + "/1/accept")).andExpect(status().isUnauthorized());
		getAs(APP, "not-a-token").andExpect(status().isUnauthorized());
	}

	@Test
	void subscribedBuilderInvitesAMemberWithServerSetOwnership() throws Exception {
		subscribe(bobId, 5);

		long id = id(postAs(APP, bob, """
				{"email": "Alice@Example.com", "role": "sales-executive",
				 "permissions": {"lead": {"view": true, "list": false}}, "notes": " Field team "}""")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.builder.id").value(bobId))
			.andExpect(jsonPath("$.builder.email").value(nullValue()))
			.andExpect(jsonPath("$.employee.id").value(aliceId))
			.andExpect(jsonPath("$.employee.fullName").value("alice"))
			// Not revealed until the employee has joined.
			.andExpect(jsonPath("$.employee.email").value(nullValue()))
			.andExpect(jsonPath("$.employee.phone").value(nullValue()))
			.andExpect(jsonPath("$.invitedBy.id").value(bobId))
			.andExpect(jsonPath("$.role").value(SALES_ROLE))
			.andExpect(jsonPath("$.permissions.lead.view").value(true))
			.andExpect(jsonPath("$.status").value("pending"))
			.andExpect(jsonPath("$.joinedAt").value(nullValue()))
			.andExpect(jsonPath("$.notes").value("Field team")));

		assertThat(column(id, "user_id")).isEqualTo(String.valueOf(bobId));
		assertThat(column(id, "builder_id")).isEqualTo(String.valueOf(bobId));
		assertThat(column(id, "employee_id")).isEqualTo(String.valueOf(aliceId));
	}

	@Test
	void membersCanBeInvitedByPhone() throws Exception {
		subscribe(bobId, 5);

		postAs(APP, bob, "{\"phone\": \"98765 00001\", \"role\": \"sales-executive\"}")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.employee.id").value(aliceId));
	}

	@ParameterizedTest
	@ValueSource(strings = { "\"builderId\": 3", "\"employeeId\": 4", "\"userId\": 3", "\"invitedBy\": 3",
			"\"status\": \"active\"", "\"joinedAt\": \"2026-01-01T00:00:00Z\"", "\"id\": 9", "\"deletedAt\": null" })
	void protectedFieldsCannotBeSpoofed(String field) throws Exception {
		subscribe(bobId, 5);

		postAs(APP, bob, invitation("alice@example.com").replaceFirst("\\{", "{" + field + ", "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"));
		assertThat(count("SELECT count(*) FROM builder_teams")).isZero();
	}

	@Test
	void invitationsNeedASubscriptionThatIncludesTeamManagement() throws Exception {
		postAs(APP, bob, invitation("alice@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_required"));

		subscribe(bobId, 5, "active", "now() - interval '40 days'", "now() - interval '10 days'");
		postAs(APP, bob, invitation("alice@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_expired"));

		subscribe(carolId, 0);
		postAs(APP, carol, invitation("alice@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("team_management_not_included"));
		assertThat(count("SELECT count(*) FROM builder_teams")).isZero();
	}

	@Test
	void pendingAndActiveMembersUseSeatsAndInactiveOnesDoNot() throws Exception {
		subscribe(bobId, 2);
		long first = invite(bob, "alice@example.com");
		member(bobId, carolId, "active");

		postAs(APP, bob, invitation("dave@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("team_member_limit_reached"))
			.andExpect(jsonPath("$.teamMemberLimit").value(2))
			.andExpect(jsonPath("$.currentTeamMembers").value(2));

		postAs(MEMBERSHIPS + "/" + first + "/accept", alice, "").andExpect(status().isOk());
		patchAs(APP + "/" + first, bob, "{\"status\": \"inactive\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("inactive"));
		long third = invite(bob, "dave@example.com");

		// Reactivating needs a free seat as well.
		patchAs(APP + "/" + first, bob, "{\"status\": \"active\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("team_member_limit_reached"));
		deleteAs(APP + "/" + third, bob).andExpect(status().isNoContent());
		patchAs(APP + "/" + first, bob, "{\"status\": \"active\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"));
	}

	@Test
	void duplicateOpenMembershipsAreRejectedButAnswerdInvitationsCanBeRepeated() throws Exception {
		subscribe(bobId, 5);
		long first = invite(bob, "alice@example.com");

		postAs(APP, bob, invitation("alice@example.com"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("builder_team_duplicate_membership"));

		postAs(MEMBERSHIPS + "/" + first + "/reject", alice, "")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("rejected"));
		invite(bob, "alice@example.com");
		assertThat(count("SELECT count(*) FROM builder_teams WHERE employee_id = ?", aliceId)).isEqualTo(2);
	}

	@Test
	void ineligibleEmployeesAreRejected() throws Exception {
		subscribe(bobId, 5);
		long unverified = account("unverified@example.com", "user");
		jdbc.update("UPDATE users SET email_verified = NULL WHERE id = ?", unverified);
		long blocked = account("blocked@example.com", "user");
		jdbc.update("UPDATE users SET status = 'suspended' WHERE id = ?", blocked);

		postAs(APP, bob, invitation("bob@example.com"))
			.andExpect(status().isUnprocessableContent())
			.andExpect(jsonPath("$.code").value("builder_team_self_membership"));
		for (String email : new String[] { "nobody@example.com", "unverified@example.com", "blocked@example.com",
				"admin@example.com" }) {
			postAs(APP, bob, invitation(email))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.email").value("must belong to an active, verified app user"));
		}
		postAs(APP, bob, "{\"email\": \"alice@example.com\", \"phone\": \"98765 00001\", \"role\": \"sales-executive\"}")
			.andExpect(status().isBadRequest());
		postAs(APP, bob, "{\"role\": \"sales-executive\"}").andExpect(status().isBadRequest());
		assertThat(count("SELECT count(*) FROM builder_teams")).isZero();
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"\"role\": \"unknown-role\"",
			"\"role\": \"admin\"",
			"\"role\": \"super-admin\"",
			"\"role\": \"Sales_Executive\"",
			"\"role\": \"powerful\"",
			"\"role\": \"sales-executive\", \"permissions\": {\"lead\": {\"view_any\": true}}",
			"\"role\": \"sales-executive\", \"permissions\": {\"admin_panel\": {\"access\": true}}",
			"\"role\": \"sales-executive\", \"permissions\": {\"role\": {\"create\": true}}",
			"\"role\": \"sales-executive\", \"permissions\": {\"Lead\": {\"view\": true}}",
			"\"role\": \"sales-executive\", \"permissions\": {\"lead\": {\"view\": \"yes\"}}",
			"\"role\": \"sales-executive\", \"permissions\": [\"LEAD_VIEW\"]"
	})
	void unauthorizedOrInvalidRolesAndPermissionsAreRejected(String fields) throws Exception {
		subscribe(bobId, 5);
		// Grants something the builder (user role) does not hold.
		role("powerful", "{\"lead\": {\"view_any\": true}}");

		postAs(APP, bob, "{\"email\": \"alice@example.com\", " + fields + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"));
		assertThat(count("SELECT count(*) FROM builder_teams")).isZero();
	}

	@Test
	void otherBuildersMembershipsAreNotFound() throws Exception {
		subscribe(carolId, 5);
		long carols = invite(carol, "alice@example.com");

		getAs(APP + "/" + carols, bob).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("builder_team_member_not_found"));
		patchAs(APP + "/" + carols, bob, "{\"notes\": \"mine\"}").andExpect(status().isNotFound());
		deleteAs(APP + "/" + carols, bob).andExpect(status().isNotFound());
		getAs(APP + "/999999", bob).andExpect(status().isNotFound());
		getAs(APP, bob).andExpect(jsonPath("$.totalElements").value(0));
		// The employee sees it only through their own memberships, never as team management.
		getAs(APP + "/" + carols, alice).andExpect(status().isNotFound());
		getAs(MEMBERSHIPS + "/" + carols, bob).andExpect(status().isNotFound());
		assertThat(column(carols, "notes")).isNull();
		assertThat(column(carols, "deleted_at")).isNull();
	}

	@Test
	void teamMembersCannotManageTheTeamWithoutPermission() throws Exception {
		// App logins are user-role accounts only, so the user role itself loses team management here.
		appUserPermissions("{\"lead\": {\"view\": true}}");
		long eve = account("eve@example.com", "user");
		String eveToken = token("eve@example.com");
		long membership = member(bobId, eve, "active");

		getAs(APP, eveToken).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("builder_team_action_forbidden"));
		getAs(APP + "/" + membership, eveToken).andExpect(status().isNotFound());
		postAs(APP, eveToken, invitation("alice@example.com")).andExpect(status().isForbidden());
	}

	@Test
	void eachActionNeedsItsOwnPermission() throws Exception {
		appUserPermissions("{\"builder_team\": {\"list\": true, \"view\": true, \"update\": true}}");
		long viewer = account("viewer@example.com", "user");
		String viewerToken = token("viewer@example.com");
		long membership = member(viewer, aliceId, "active");

		getAs(APP, viewerToken).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
		getAs(APP + "/" + membership, viewerToken).andExpect(status().isOk());
		deleteAs(APP + "/" + membership, viewerToken).andExpect(status().isForbidden());
		postAs(APP, viewerToken, invitation("dave@example.com")).andExpect(status().isForbidden());
		patchAs(APP + "/" + membership, viewerToken, "{\"role\": \"sales-executive\", \"status\": \"inactive\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("builder_team_fields_forbidden"))
			.andExpect(jsonPath("$.fields", containsInAnyOrder("role", "status")));
		patchAs(APP + "/" + membership, viewerToken, "{\"notes\": \"ok\"}").andExpect(status().isOk());
		assertThat(column(membership, "status")).isEqualTo("active");
	}

	@Test
	void builderUpdatesRoleAndPermissionsWithinTheirOwnAuthority() throws Exception {
		subscribe(bobId, 5);
		long id = member(bobId, aliceId, "active");

		patchAs(APP + "/" + id, bob, "{\"role\": \"user\", \"permissions\": {\"site_visit\": {\"view\": true}}}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("user"))
			.andExpect(jsonPath("$.permissions.site_visit.view").value(true))
			.andExpect(jsonPath("$.permissions.lead").doesNotExist())
			// Joined, so the builder now sees the contact details.
			.andExpect(jsonPath("$.employee.email").value("alice@example.com"));

		patchAs(APP + "/" + id, bob, "{\"permissions\": {\"site_visit\": {\"view_any\": true}}}")
			.andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"role\": \"admin\"}").andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"role\": null}").andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"builderId\": " + carolId + "}").andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"employeeId\": " + daveId + "}").andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"status\": \"pending\"}").andExpect(status().isBadRequest());
		patchAs(APP + "/" + id, bob, "{\"status\": \"rejected\"}").andExpect(status().isBadRequest());
		assertThat(column(id, "builder_id")).isEqualTo(String.valueOf(bobId));
		assertThat(column(id, "employee_id")).isEqualTo(String.valueOf(aliceId));
		assertThat(column(id, "role")).isEqualTo("user");
	}

	@Test
	void buildersCannotAcceptInvitationsOnTheEmployeesBehalf() throws Exception {
		subscribe(bobId, 5);
		long id = invite(bob, "alice@example.com");

		patchAs(APP + "/" + id, bob, "{\"status\": \"active\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("builder_team_invalid_status_transition"));
		assertThat(column(id, "status")).isEqualTo("pending");
	}

	@Test
	void revokedMembershipsAreHistory() throws Exception {
		subscribe(bobId, 5);
		long id = member(bobId, aliceId, "active");

		patchAs(APP + "/" + id, bob, "{\"status\": \"revoked\"}").andExpect(status().isOk());

		patchAs(APP + "/" + id, bob, "{\"role\": \"user\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("builder_team_member_not_editable"));
		patchAs(APP + "/" + id, bob, "{\"status\": \"active\"}").andExpect(status().isConflict());
		// The seat and the pair are free again.
		invite(bob, "alice@example.com");
	}

	@Test
	void expiredBuildersCanStillReduceTheirTeamButNotGrowOrRegrantIt() throws Exception {
		subscribe(bobId, 5);
		long active = member(bobId, aliceId, "active");
		long other = member(bobId, daveId, "active");
		expireSubscription(bobId);

		getAs(APP, bob).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
		patchAs(APP + "/" + active, bob, "{\"permissions\": {\"lead\": {\"view\": true}}}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_expired"));
		patchAs(APP + "/" + active, bob, "{\"status\": \"inactive\", \"notes\": \"paused\"}").andExpect(status().isOk());
		patchAs(APP + "/" + active, bob, "{\"status\": \"active\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_expired"));
		deleteAs(APP + "/" + other, bob).andExpect(status().isNoContent());
		postAs(APP, bob, invitation("carol@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("subscription_expired"));
	}

	@Test
	void upgradesAndDowngradesApplyToNewSeatsOnly() throws Exception {
		subscribe(bobId, 1);
		invite(bob, "alice@example.com");
		postAs(APP, bob, invitation("dave@example.com")).andExpect(status().isForbidden());

		expireSubscription(bobId);
		subscribe(bobId, 3);
		invite(bob, "dave@example.com");

		// Downgrade below current usage: nobody is removed, but no new seat is given.
		expireSubscription(bobId);
		subscribe(bobId, 1);
		getAs(APP, bob).andExpect(jsonPath("$.totalElements").value(2));
		postAs(APP, bob, invitation("carol@example.com"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("team_member_limit_reached"))
			.andExpect(jsonPath("$.currentTeamMembers").value(2));
	}

	@Test
	void removingAMemberSoftDeletesItAndKeepsSiteVisitHistory() throws Exception {
		subscribe(bobId, 5);
		long id = member(bobId, aliceId, "active");
		long propertyId = jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
				    project_email, project_phone)
				VALUES (?, 'team-history', 'villa', 'Test', 'Builder', 'a@example.com', '+919876543210')
				RETURNING id""", Long.class, bobId);
		long visitId = jdbc.queryForObject("""
				INSERT INTO site_visits (builder_id, property_id, assign_id, visit_date, visit_time, name, mobile)
				VALUES (?, ?, ?, current_date + 1, '10:00', 'Ravi', '+919876543210') RETURNING id""",
				Long.class, bobId, propertyId, aliceId);

		patchAs(APP + "/" + id, bob, "{\"role\": \"user\"}").andExpect(status().isOk());
		deleteAs(APP + "/" + id, bob).andExpect(status().isNoContent());

		assertThat(column(id, "status")).isEqualTo("revoked");
		assertThat(column(id, "deleted_at")).isNotNull();
		getAs(APP + "/" + id, bob).andExpect(status().isNotFound());
		getAs(APP, bob).andExpect(jsonPath("$.totalElements").value(0));
		deleteAs(APP + "/" + id, bob).andExpect(status().isNotFound());
		assertThat(count("SELECT count(*) FROM site_visits WHERE id = ? AND assign_id = ? AND deleted_at IS NULL",
				visitId, aliceId)).isOne();
	}

	@Test
	void employeesSeeAndAnswerOnlyTheirOwnInvitations() throws Exception {
		subscribe(bobId, 5);
		long id = id(postAs(APP, bob, """
				{"email": "alice@example.com", "role": "sales-executive", "notes": "internal"}""")
			.andExpect(status().isCreated()));

		getAs(MEMBERSHIPS + "?status=pending", alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].builder.id").value(bobId))
			.andExpect(jsonPath("$.content[0].builder.email").value(nullValue()))
			.andExpect(jsonPath("$.content[0].notes").value(nullValue()));
		getAs(MEMBERSHIPS, dave).andExpect(jsonPath("$.totalElements").value(0));
		postAs(MEMBERSHIPS + "/" + id + "/accept", dave, "").andExpect(status().isNotFound());
		postAs(MEMBERSHIPS + "/" + id + "/accept", bob, "").andExpect(status().isNotFound());

		postAs(MEMBERSHIPS + "/" + id + "/accept", alice, "")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("active"))
			.andExpect(jsonPath("$.joinedAt").isNotEmpty());
		postAs(MEMBERSHIPS + "/" + id + "/reject", alice, "").andExpect(status().isConflict());
		getAs(APP + "/" + id, bob).andExpect(jsonPath("$.employee.email").value("alice@example.com"));
	}

	@Test
	void listsArePaginatedFilteredAndSorted() throws Exception {
		subscribe(bobId, 10);
		long a = invite(bob, "alice@example.com");
		long d = invite(bob, "dave@example.com");
		long c = member(bobId, carolId, "inactive");
		jdbc.update("UPDATE builder_teams SET role = 'user' WHERE id = ?", d);

		getAs(APP + "?size=2&sort=createdAt,asc", bob)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(2))
			.andExpect(jsonPath("$.content.length()").value(2))
			.andExpect(jsonPath("$.content[0].id").value(a));
		getAs(APP + "?status=inactive", bob).andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) c)));
		getAs(APP + "?role=user", bob).andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) d)));
		getAs(APP + "?search=DAVE", bob).andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) d)));
		getAs(APP + "?search=500001", bob).andExpect(jsonPath("$.content[*].id", containsInAnyOrder((int) a)));
		getAs(APP + "?search=%25", bob).andExpect(jsonPath("$.totalElements").value(0));
		getAs(APP + "?sort=passwordHash", bob).andExpect(status().isBadRequest());
		getAs(APP + "?status=archived", bob).andExpect(status().isBadRequest());
		getAs(APP + "?size=500", bob).andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void responsesExposeNoAuthenticationOrDocumentData() throws Exception {
		subscribe(bobId, 5);
		long id = member(bobId, aliceId, "active");

		for (String path : new String[] { APP, APP + "/" + id }) {
			getAs(path, bob)
				.andExpect(status().isOk())
				.andExpect(content().string(not(containsString("password"))))
				.andExpect(content().string(not(containsString("$2a$"))))
				.andExpect(content().string(not(containsString("notificationToken"))))
				.andExpect(content().string(not(containsString("aadhar"))))
				.andExpect(content().string(not(containsString("userType"))));
		}
	}

}
