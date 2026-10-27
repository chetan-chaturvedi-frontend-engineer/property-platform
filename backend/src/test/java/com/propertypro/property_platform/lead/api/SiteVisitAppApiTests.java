package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Mobile app site visits: booking, ownership, per-relation edits, status, report and listing. */
class SiteVisitAppApiTests extends SiteVisitApiTestSupport {

	@Test
	void unauthenticatedRequestsAreRejected() throws Exception {
		mvc.perform(get(APP)).andExpect(status().isUnauthorized());
		mvc.perform(post(APP).contentType(MediaType.APPLICATION_JSON).content(booking(1)))
			.andExpect(status().isUnauthorized());
		mvc.perform(get(APP + "/1")).andExpect(status().isUnauthorized());
		mvc.perform(patch(APP + "/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(patch(APP + "/1/status").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(post(APP + "/1/report").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		getAs(APP, "not-a-token").andExpect(status().isUnauthorized());
	}

	@Test
	void bookingAPublishedPropertySetsOwnershipFromTheServer() throws Exception {
		long propertyId = property(bobId, "published");

		postAs(APP, alice, booking(propertyId))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.visitCode").value(matchesPattern("SV-[0-9]{6,}")))
			.andExpect(jsonPath("$.property.id").value(propertyId))
			.andExpect(jsonPath("$.property.projectName").value("Green Acres"))
			.andExpect(jsonPath("$.builder.id").value(bobId))
			.andExpect(jsonPath("$.builder.email").doesNotExist())
			.andExpect(jsonPath("$.customer.id").value(aliceId))
			.andExpect(jsonPath("$.scheduledBy.id").value(aliceId))
			.andExpect(jsonPath("$.assignee").value(nullValue()))
			.andExpect(jsonPath("$.status").value("scheduled"))
			.andExpect(jsonPath("$.visitType").value("site_visit"))
			.andExpect(jsonPath("$.mobile").value(PHONE_E164))
			.andExpect(jsonPath("$.email").value("ravi@example.com"))
			.andExpect(jsonPath("$.numberOfPeople").value(3));
	}

	@ParameterizedTest
	@ValueSource(strings = { "\"builderId\": 1", "\"userId\": 1", "\"assignId\": 1", "\"status\": \"completed\"",
			"\"reportSubmittedBy\": 1", "\"scheduledBy\": 1", "\"id\": 9", "\"rating\": 5", "\"leadId\": 1",
			"\"deletedAt\": null" })
	void protectedFieldsCannotBeSetOnBooking(String field) throws Exception {
		long propertyId = property(bobId, "published");

		postAs(APP, alice, booking(propertyId).replaceFirst("\\{", "{" + field + ", "))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"));
		assertThat(count("SELECT count(*) FROM site_visits")).isZero();
	}

	@ParameterizedTest
	@ValueSource(strings = { "draft", "pending_review", "approved", "suspended", "archived", "missing", "deleted" })
	void otherUsersUnpublishedOrMissingPropertiesCannotBeBooked(String state) throws Exception {
		long propertyId = state.equals("missing") ? 999_999 : property(bobId, state.equals("deleted") ? "published" : state);
		if (state.equals("deleted")) {
			jdbc.update("UPDATE property_projects SET deleted_at = now() WHERE id = ?", propertyId);
		}

		postAs(APP, alice, booking(propertyId))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.propertyId").value("must be a published property"));
	}

	@Test
	void buildersRecordWalkInsAtTheirOwnUnpublishedProperty() throws Exception {
		long propertyId = property(aliceId, "draft");

		postAs(APP, alice, booking(propertyId))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.builder.id").value(aliceId))
			.andExpect(jsonPath("$.customer").value(nullValue()))
			.andExpect(jsonPath("$.scheduledBy.id").value(aliceId));
	}

	@Test
	void unrelatedUsersGetNotFoundEverywhereAndAnEmptyList() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		long carolId = account("carol@example.com", "user");
		String carol = token("carol@example.com");

		getAs(path(visitId), carol).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("site_visit_not_found"));
		patchAs(path(visitId), carol, "{\"note\": \"x\"}").andExpect(status().isNotFound());
		patchAs(path(visitId) + "/status", carol, "{\"status\": \"cancelled\", \"cancellationReason\": \"x\"}")
			.andExpect(status().isNotFound());
		patchAs(path(visitId) + "/assign", carol, "{\"assignId\": " + carolId + "}").andExpect(status().isNotFound());
		postAs(path(visitId) + "/report", carol, "{\"interest\": \"high\"}").andExpect(status().isNotFound());
		getAs(APP, carol).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
		getAs(APP + "?propertyId=" + column("site_visits", visitId, "property_id"), carol)
			.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void appEndpointsNeverUseAdminPermissions() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		getAs(path(visitId), admin).andExpect(status().isNotFound());
		patchAs(path(visitId), admin, "{\"note\": \"x\"}").andExpect(status().isNotFound());
		getAs(APP, admin).andExpect(status().isForbidden());
	}

	@Test
	void buildersSeeVisitsAcrossAllTheirPropertiesAndVisitorsSeeTheirOwn() throws Exception {
		long first = property(bobId, "published");
		long second = property(bobId, "published");
		book(alice, first);
		book(alice, second);
		account("carol@example.com", "user");
		String carol = token("carol@example.com");
		book(carol, first);

		getAs(APP, bob).andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.content[0].interest").value(nullValue()));
		getAs(APP + "?propertyId=" + first, bob).andExpect(jsonPath("$.totalElements").value(2));
		getAs(APP + "?relation=visitor", bob).andExpect(jsonPath("$.totalElements").value(0));
		getAs(APP, alice).andExpect(jsonPath("$.totalElements").value(2));
		getAs(APP + "?relation=builder", alice).andExpect(jsonPath("$.totalElements").value(0));
		getAs(APP, carol).andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	void listsArePaginatedFilteredAndSortedByAllowedFields() throws Exception {
		long propertyId = property(bobId, "published");
		postAs(APP, alice, booking(propertyId, tomorrow().plusDays(2), "09:00")).andExpect(status().isCreated());
		postAs(APP, alice, booking(propertyId, tomorrow(), "11:00")).andExpect(status().isCreated());
		postAs(APP, alice, booking(propertyId, tomorrow(), "09:00").replace("\"numberOfPeople\": 3",
				"\"numberOfPeople\": 3, \"visitType\": \"virtual_visit\"")).andExpect(status().isCreated());

		getAs(APP + "?sort=visitDate,asc&size=2", alice)
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(2))
			.andExpect(jsonPath("$.content.length()").value(2))
			.andExpect(jsonPath("$.content[0].visitTime").value("09:00:00"))
			.andExpect(jsonPath("$.content[1].visitTime").value("11:00:00"));
		getAs(APP + "?visitType=virtual_visit", alice).andExpect(jsonPath("$.totalElements").value(1));
		getAs(APP + "?when=past", alice).andExpect(jsonPath("$.totalElements").value(0));
		getAs(APP + "?when=upcoming&visitDateTo=" + tomorrow(), alice).andExpect(jsonPath("$.totalElements").value(2));
		getAs(APP + "?sort=mobile,asc", alice).andExpect(status().isBadRequest());
		getAs(APP + "?status=open", alice).andExpect(status().isBadRequest());
		getAs(APP + "?visitDateFrom=" + tomorrow() + "&visitDateTo=" + today(), alice)
			.andExpect(status().isBadRequest());
		getAs(APP + "?size=500", alice).andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void theBuilderEditsBookingFieldsAndMovingTheDateReschedules() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(path(visitId), bob, """
				{"visitDate": "%s", "visitTime": "16:00", "numberOfPeople": 5, "note": "Bring documents",
				 "nextFollowUp": "2030-01-01T10:00:00Z", "followUpNote": "Call back"}""".formatted(tomorrow().plusDays(1)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("rescheduled"))
			.andExpect(jsonPath("$.visitTime").value("16:00:00"))
			.andExpect(jsonPath("$.numberOfPeople").value(5))
			.andExpect(jsonPath("$.followUpNote").value("Call back"));
		assertThat(column("site_visits", visitId, "builder_id")).isEqualTo(String.valueOf(bobId));
		assertThat(column("site_visits", visitId, "user_id")).isEqualTo(String.valueOf(aliceId));
	}

	@Test
	void eachRelationMayOnlyChangeItsOwnFields() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(path(visitId), bob, "{\"userId\": " + bobId + "}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("site_visit_fields_forbidden"))
			.andExpect(jsonPath("$.fields", containsInAnyOrder("userId")));
		patchAs(path(visitId), bob, "{\"leadId\": 1, \"note\": \"x\"}").andExpect(status().isForbidden());
		patchAs(path(visitId), alice, "{\"note\": \"x\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("site_visit_action_forbidden"));
		assertThat(column("site_visits", visitId, "note")).isNull();
	}

	@ParameterizedTest
	@ValueSource(strings = { "{\"builderId\": 1}", "{\"assignId\": 1}", "{\"status\": \"completed\"}",
			"{\"reportSubmittedBy\": 1}", "{\"propertyId\": 1}", "{\"rating\": 5}", "{\"cancelledAt\": null}" })
	void protectedFieldsCannotBeChangedOnUpdate(String body) throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(path(visitId), bob, body).andExpect(status().isBadRequest());
		patchAs(adminPath(visitId), admin, body).andExpect(status().isBadRequest());
		assertThat(column("site_visits", visitId, "status")).isEqualTo("scheduled");
	}

	@Test
	void theVisitorMayOnlyCancelWithAReason() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(path(visitId) + "/status", alice, "{\"status\": \"confirmed\"}").andExpect(status().isForbidden());
		patchAs(path(visitId) + "/status", alice, "{\"status\": \"cancelled\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.cancellationReason").exists());
		patchAs(path(visitId) + "/status", alice, "{\"status\": \"cancelled\", \"cancellationReason\": \"Travelling\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("cancelled"))
			.andExpect(jsonPath("$.cancelledAt").exists())
			.andExpect(jsonPath("$.cancellationReason").value("Travelling"));
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"confirmed\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_invalid_status_transition"));
		patchAs(path(visitId), bob, "{\"note\": \"x\"}").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_not_editable"));
	}

	@Test
	void completingNeedsTheVisitDayAndNoFutureVisitTime() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		patchAs(path(visitId) + "/status", bob, "{\"status\": \"completed\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_not_due"));
		dueToday(visitId);
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"completed\", \"actualVisitDate\": \"2099-01-01T00:00:00Z\"}")
			.andExpect(status().isBadRequest());
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"rescheduled\"}").andExpect(status().isBadRequest());
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"confirmed\", \"cancellationReason\": \"x\"}")
			.andExpect(status().isBadRequest());
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"completed\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.actualVisitDate").exists());
	}

	@Test
	void theAssigneeWorksOnTheVisitWithinItsFieldsAndTheReportLocks() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		long carolId = agent("carol@example.com");
		String carol = token("carol@example.com");

		patchAs(path(visitId) + "/assign", alice, "{\"assignId\": " + carolId + "}").andExpect(status().isForbidden());
		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": " + carolId + "}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignee.id").value(carolId))
			.andExpect(jsonPath("$.assignedAt").exists());

		getAs(APP, carol).andExpect(jsonPath("$.totalElements").value(1));
		patchAs(path(visitId), carol, "{\"numberOfPeople\": 2}").andExpect(status().isOk());
		patchAs(path(visitId), carol, "{\"name\": \"Someone else\"}")
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.fields", containsInAnyOrder("name")));
		patchAs(path(visitId) + "/assign", carol, "{\"assignId\": null}").andExpect(status().isForbidden());

		postAs(path(visitId) + "/report", carol, "{\"interest\": \"high\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_report_not_allowed"));
		dueToday(visitId);
		patchAs(path(visitId) + "/status", carol, "{\"status\": \"completed\"}").andExpect(status().isOk());
		postAs(path(visitId) + "/report", carol, """
				{"interest": "high", "visitNote": "Liked the clubhouse", "duration": 45, "visitedWith": "Spouse",
				 "feedback": "Good", "rating": 5, "nextFollowUp": "2099-01-01T10:00:00Z", "followUpNote": "Send prices",
				 "reportSubmittedBy": 1}""")
			.andExpect(status().isBadRequest());
		postAs(path(visitId) + "/report", carol, """
				{"interest": "high", "visitNote": "Liked the clubhouse", "duration": 45, "visitedWith": "Spouse",
				 "feedback": "Good", "rating": 5, "nextFollowUp": "2099-01-01T10:00:00Z", "followUpNote": "Send prices"}""")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.report.interest").value("high"))
			.andExpect(jsonPath("$.report.rating").value(5))
			.andExpect(jsonPath("$.report.submittedBy.id").value(carolId));
		postAs(path(visitId) + "/report", bob, "{\"interest\": \"low\"}")
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_report_locked"));

		// The visitor sees the visit, never the internal sales fields.
		getAs(path(visitId), alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.report").value(nullValue()))
			.andExpect(jsonPath("$.nextFollowUp").value(nullValue()))
			.andExpect(jsonPath("$.followUpNote").value(nullValue()));
		getAs(path(visitId), bob).andExpect(jsonPath("$.report.visitNote").value("Liked the clubhouse"));
	}

	@Test
	void onlyEligibleUsersCanBeAssigned() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		long carolId = account("carol@example.com", "user");

		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": " + carolId + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.assignId").exists());
		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": 999999}").andExpect(status().isBadRequest());
		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": " + adminId + "}").andExpect(status().isOk());
		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": " + bobId + "}").andExpect(status().isOk());
		patchAs(path(visitId) + "/assign", bob, "{\"assignId\": null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignee").value(nullValue()))
			.andExpect(jsonPath("$.assignedAt").value(nullValue()));
	}

	@Test
	void reportsNeedValidValues() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		dueToday(visitId);
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"completed\"}").andExpect(status().isOk());

		for (String body : new String[] { "{}", "{\"interest\": \"maybe\"}", "{\"interest\": \"high\", \"rating\": 0}",
				"{\"interest\": \"high\", \"rating\": 6}", "{\"interest\": \"high\", \"duration\": -1}",
				"{\"interest\": \"high\", \"duration\": 1441}",
				"{\"interest\": \"high\", \"nextFollowUp\": \"2000-01-01T00:00:00Z\"}" }) {
			postAs(path(visitId) + "/report", bob, body).andExpect(status().isBadRequest());
		}
		postAs(path(visitId) + "/report", alice, "{\"interest\": \"high\"}").andExpect(status().isForbidden());
		assertThat(column("site_visits", visitId, "report_submitted_by")).isNull();
	}

	@Test
	void repeatedBookingsOfTheSameSlotConflictUntilCancelled() throws Exception {
		long propertyId = property(bobId, "published");
		long visitId = book(alice, propertyId);

		postAs(APP, alice, booking(propertyId))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("site_visit_duplicate"));
		postAs(APP, alice, booking(propertyId, tomorrow(), "12:00")).andExpect(status().isCreated());
		patchAs(path(visitId) + "/status", alice, "{\"status\": \"cancelled\", \"cancellationReason\": \"x\"}")
			.andExpect(status().isOk());
		postAs(APP, alice, booking(propertyId)).andExpect(status().isCreated());
		assertThat(count("SELECT count(*) FROM site_visits")).isEqualTo(3);
	}

	@ParameterizedTest
	@ValueSource(strings = { "visitDate=\"2000-01-01\"", "visitDate=\"2999-01-01\"", "visitDate=\"tomorrow\"",
			"visitDate=null", "visitTime=\"25:00\"", "email=\"not-an-email\"", "mobile=\"12\"", "mobile=\"\"",
			"name=\" \"", "numberOfPeople=0", "numberOfPeople=101", "visitType=\"drive_by\"", "propertyId=-1",
			"propertyId=null", "unknown=1" })
	void invalidBookingsAreRejected(String override) throws Exception {
		long propertyId = property(bobId, "published");
		Map<String, String> fields = new LinkedHashMap<>(Map.of("propertyId", String.valueOf(propertyId),
				"visitDate", "\"" + tomorrow() + "\"", "visitTime", "\"10:30\"", "name", "\"Ravi\"",
				"mobile", "\"98765 43210\""));
		String[] parts = override.split("=", 2);
		fields.put(parts[0], parts[1]);
		String body = fields.entrySet().stream().map(field -> "\"" + field.getKey() + "\": " + field.getValue())
			.collect(Collectors.joining(", ", "{", "}"));

		postAs(APP, alice, body).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value(not(containsString("Exception"))));
		assertThat(count("SELECT count(*) FROM site_visits")).isZero();
	}

	@Test
	void aVisitTimeEarlierTodayIsRejected() throws Exception {
		long propertyId = property(bobId, "published");

		postAs(APP, alice, booking(propertyId, today(), "00:00"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.visitTime").exists());
	}

	@Test
	void deletedVisitsDisappearFromTheApp() throws Exception {
		long visitId = book(alice, property(bobId, "published"));

		deleteAs(adminPath(visitId), admin).andExpect(status().isNoContent());

		getAs(path(visitId), alice).andExpect(status().isNotFound());
		getAs(path(visitId), bob).andExpect(status().isNotFound());
		getAs(APP, bob).andExpect(jsonPath("$.totalElements").value(0));
		patchAs(path(visitId), bob, "{\"note\": \"x\"}").andExpect(status().isNotFound());
	}

	@Test
	void usersWithoutTheAppPermissionsAreForbidden() throws Exception {
		long visitId = book(alice, property(bobId, "published"));
		jdbc.update("UPDATE roles SET permissions = permissions - 'site_visit' WHERE slug = 'user'");

		getAs(APP, alice).andExpect(status().isForbidden());
		getAs(path(visitId), alice).andExpect(status().isForbidden());
		postAs(APP, alice, booking(property(bobId, "published"))).andExpect(status().isForbidden());
		patchAs(path(visitId), bob, "{\"note\": \"x\"}").andExpect(status().isForbidden());
		patchAs(path(visitId) + "/status", bob, "{\"status\": \"confirmed\"}").andExpect(status().isForbidden());
	}

}
