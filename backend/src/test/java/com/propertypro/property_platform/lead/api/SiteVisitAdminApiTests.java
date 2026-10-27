package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin dashboard site visits: CRUD over every visit, permission checks and relationship validation. */
class SiteVisitAdminApiTests extends SiteVisitApiTestSupport {

	@Test
	void adminsCreateViewListUpdateAndDeleteAnyVisit() throws Exception {
		long propertyId = property(bobId, "draft");
		long leadId = createLead(admin);
		String body = booking(propertyId).replaceFirst("\\{",
				"{\"userId\": %d, \"assignId\": %d, \"leadId\": %d, \"followUpNote\": \"VIP\", ".formatted(aliceId,
						adminId, leadId));

		long visitId = id(postAs(ADMIN, admin, body)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.builder.id").value(bobId))
			.andExpect(jsonPath("$.customer.id").value(aliceId))
			.andExpect(jsonPath("$.assignee.id").value(adminId))
			.andExpect(jsonPath("$.scheduledBy.id").value(adminId))
			.andExpect(jsonPath("$.leadId").value(leadId))
			.andExpect(jsonPath("$.followUpNote").value("VIP")));

		getAs(adminPath(visitId), admin).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(visitId));
		getAs(ADMIN + "?builderId=" + bobId + "&status=scheduled&search=ravi", admin)
			.andExpect(jsonPath("$.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].visitCode").exists());
		getAs(ADMIN + "?search=43210", admin).andExpect(jsonPath("$.totalElements").value(1));
		getAs(ADMIN + "?assignId=" + bobId, admin).andExpect(jsonPath("$.totalElements").value(0));

		patchAs(adminPath(visitId), admin, "{\"userId\": null, \"leadId\": null, \"name\": \"Asha\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.customer").value(nullValue()))
			.andExpect(jsonPath("$.leadId").value(nullValue()))
			.andExpect(jsonPath("$.name").value("Asha"));

		deleteAs(adminPath(visitId), admin).andExpect(status().isNoContent());
		getAs(adminPath(visitId), admin).andExpect(status().isNotFound());
		getAs(ADMIN, admin).andExpect(jsonPath("$.totalElements").value(0));
		assertThat(column("site_visits", visitId, "deleted_at")).isNotNull();
		deleteAs(adminPath(visitId), admin).andExpect(status().isNotFound());
	}

	@Test
	void appUsersAndUnauthenticatedCallersCannotUseAdminEndpoints() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		mvc.perform(get(ADMIN)).andExpect(status().isUnauthorized());
		getAs(ADMIN, bob).andExpect(status().isForbidden());
		getAs(adminPath(visitId), bob).andExpect(status().isForbidden());
		deleteAs(adminPath(visitId), bob).andExpect(status().isForbidden());
		patchAs(adminPath(visitId), bob, "{\"note\": \"x\"}").andExpect(status().isForbidden());
		assertThat(count("SELECT count(*) FROM site_visits WHERE deleted_at IS NULL")).isOne();
	}

	@Test
	void eachAdminActionNeedsItsOwnPermission() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		role("viewer", "\"site_visit\": {\"view_any\": true}");
		account("viewer@example.com", "viewer");
		String viewer = token("viewer@example.com");
		role("lister", "\"site_visit\": {\"list_any\": true}");
		account("lister@example.com", "lister");
		String lister = token("lister@example.com");

		getAs(adminPath(visitId), viewer).andExpect(status().isOk());
		getAs(ADMIN, viewer).andExpect(status().isForbidden());
		postAs(ADMIN, viewer, booking(property(bobId, "published"))).andExpect(status().isForbidden());
		patchAs(adminPath(visitId), viewer, "{\"note\": \"x\"}").andExpect(status().isForbidden());
		patchAs(adminPath(visitId) + "/status", viewer, "{\"status\": \"confirmed\"}").andExpect(status().isForbidden());
		patchAs(adminPath(visitId) + "/assign", viewer, "{\"assignId\": null}").andExpect(status().isForbidden());
		postAs(adminPath(visitId) + "/report", viewer, "{\"interest\": \"high\"}").andExpect(status().isForbidden());
		deleteAs(adminPath(visitId), viewer).andExpect(status().isForbidden());

		getAs(ADMIN, lister).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
		getAs(adminPath(visitId), lister).andExpect(status().isForbidden());
		assertThat(column("site_visits", visitId, "note")).isNull();
	}

	@Test
	void assigningOnCreateNeedsTheAssignPermission() throws Exception {
		role("desk", "\"site_visit\": {\"create_any\": true, \"view_any\": true}");
		long deskId = account("desk@example.com", "desk");
		String desk = token("desk@example.com");
		long propertyId = property(bobId, "published");

		postAs(ADMIN, desk, booking(propertyId).replaceFirst("\\{", "{\"assignId\": " + adminId + ", "))
			.andExpect(status().isForbidden());
		postAs(ADMIN, desk, booking(propertyId))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.scheduledBy.id").value(deskId));
	}

	@ParameterizedTest
	@ValueSource(strings = { "userId", "assignId", "leadId", "propertyId" })
	void relatedRecordsMustExistAndBeUsable(String field) throws Exception {
		long propertyId = property(bobId, "published");
		long otherLead = createLead(alice);
		String value = switch (field) {
			case "userId" -> "999999";
			case "assignId" -> String.valueOf(aliceId);
			case "leadId" -> String.valueOf(otherLead + 1000);
			default -> "999999";
		};
		String body = field.equals("propertyId") ? booking(999_999)
				: booking(propertyId).replaceFirst("\\{", "{\"" + field + "\": " + value + ", ");

		postAs(ADMIN, admin, body)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + field).exists());
		assertThat(count("SELECT count(*) FROM site_visits")).isZero();
	}

	@Test
	void deletedPropertiesAndBlockedUsersCannotBeUsed() throws Exception {
		long propertyId = property(bobId, "published");
		jdbc.update("UPDATE users SET status = 'suspended' WHERE id = ?", aliceId);

		postAs(ADMIN, admin, booking(propertyId).replaceFirst("\\{", "{\"userId\": " + aliceId + ", "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.userId").exists());
		jdbc.update("UPDATE property_projects SET deleted_at = now() WHERE id = ?", propertyId);
		postAs(ADMIN, admin, booking(propertyId))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyId").exists());
	}

	@ParameterizedTest
	@ValueSource(strings = { "\"builderId\": 1", "\"scheduledBy\": 1", "\"status\": \"completed\"",
			"\"reportSubmittedBy\": 1", "\"actualVisitDate\": \"2026-01-01T00:00:00Z\"" })
	void adminsCannotSpoofServerControlledFields(String field) throws Exception {
		postAs(ADMIN, admin, booking(property(bobId, "published")).replaceFirst("\\{", "{" + field + ", "))
			.andExpect(status().isBadRequest());
		assertThat(count("SELECT count(*) FROM site_visits")).isZero();
	}

	@Test
	void adminsMoveAnyVisitThroughItsLifecycleAndReplaceLockedReports() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(adminPath(visitId) + "/status", admin, "{\"status\": \"confirmed\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("confirmed"));
		dueToday(visitId);
		patchAs(adminPath(visitId) + "/status", admin, "{\"status\": \"completed\"}").andExpect(status().isOk());
		postAs(path(visitId) + "/report", bob, "{\"interest\": \"low\"}").andExpect(status().isOk());

		postAs(adminPath(visitId) + "/report", admin, "{\"interest\": \"high\", \"rating\": 4}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.report.interest").value("high"))
			.andExpect(jsonPath("$.report.submittedBy.id").value(adminId));
		patchAs(adminPath(visitId) + "/status", admin, "{\"status\": \"cancelled\", \"cancellationReason\": \"x\"}")
			.andExpect(status().isConflict());
		patchAs(adminPath(visitId), admin, "{\"visitDate\": \"" + tomorrow() + "\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_not_editable"));
		patchAs(adminPath(visitId), admin, "{\"followUpNote\": \"After the visit\"}").andExpect(status().isOk());
		getAs(ADMIN + "?interest=high", admin).andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	void unknownVisitsAreNotFound() throws Exception {
		getAs(adminPath(424242), admin).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("site_visit_not_found"));
		patchAs(adminPath(424242), admin, "{\"note\": \"x\"}").andExpect(status().isNotFound());
	}

}
