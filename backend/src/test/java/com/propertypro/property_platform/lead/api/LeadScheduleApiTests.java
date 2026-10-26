package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LeadScheduleApiTests extends LeadApiTestSupport {

	private static final String VISIT = """
			{"scheduleType":"site_visit","title":"Visit tower A","description":"Bring floor plans",
			 "scheduledAt":"2026-11-05T10:30:00+05:30","durationMinutes":60,"location":"Baner site office",
			 "reminderAt":"2026-11-05T04:00:00Z"}""";
	private static final String CALL = """
			{"scheduleType":"call","title":"Intro call","scheduledAt":"2026-10-01T09:00:00Z"}""";

	private String schedules(long leadId) {
		return BASE + "/" + leadId + "/schedules";
	}

	@Test
	void createsAndListsSchedulesWithServerSetFields() throws Exception {
		long leadId = createLead(alice);

		postAs(schedules(leadId), alice, VISIT)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.leadId").value(leadId))
			.andExpect(jsonPath("$.createdBy.id").value(aliceId))
			.andExpect(jsonPath("$.status").value("pending"))
			.andExpect(jsonPath("$.scheduledAt").value("2026-11-05T05:00:00Z"))
			.andExpect(jsonPath("$.completedAt").value(nullValue()));
		// Past activities are allowed (e.g. logged late).
		long callId = createSchedule(leadId, alice, CALL);

		getAs(schedules(leadId), alice)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.content[*].title", contains("Visit tower A", "Intro call")));
		getAs(schedules(leadId) + "?sort=scheduledAt,asc", alice)
			.andExpect(jsonPath("$.content[*].title", contains("Intro call", "Visit tower A")));
		getAs(schedules(leadId) + "/" + callId, alice).andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Intro call"));
		getAs(schedules(leadId) + "?sort=title", alice).andExpect(status().isBadRequest());
		getAs(schedules(leadId) + "?status=done", alice).andExpect(status().isBadRequest());
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\",\"createdBy\":1} | createdBy",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\",\"status\":\"completed\"} | status",
			"{\"scheduleType\":\"lunch\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\"} | scheduleType",
			"{\"scheduleType\":\"call\",\"title\":\" \",\"scheduledAt\":\"2026-11-01T10:00:00Z\"} | title",
			"{\"scheduleType\":\"call\",\"title\":\"x\"} | scheduledAt",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01\"} | scheduledAt",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"tomorrow\"} | scheduledAt",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\",\"durationMinutes\":0} | durationMinutes",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\",\"durationMinutes\":1441} | durationMinutes",
			"{\"scheduleType\":\"call\",\"title\":\"x\",\"scheduledAt\":\"2026-11-01T10:00:00Z\",\"reminderAt\":\"2026-11-01T10:01:00Z\"} | reminderAt" })
	void invalidSchedulesAreRejected(String body, String errorField) throws Exception {
		long leadId = createLead(alice);

		postAs(schedules(leadId), alice, body)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + errorField).exists());
		assertThat(count("SELECT count(*) FROM lead_schedules")).isZero();
	}

	@Test
	void schedulesAreOnlyReachableThroughTheirOwnLead() throws Exception {
		long leadA = createLead(alice);
		long leadB = createLead(alice);
		long bobsLead = createLead(bob);
		long scheduleOfA = createSchedule(leadA, alice, CALL);
		long scheduleOfBob = createSchedule(bobsLead, bob, CALL);

		getAs(schedules(leadB) + "/" + scheduleOfA, alice).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("lead_schedule_not_found"));
		patchAs(schedules(leadB) + "/" + scheduleOfA, alice, "{\"title\":\"Moved\"}").andExpect(status().isNotFound());
		deleteAs(schedules(leadB) + "/" + scheduleOfA, alice).andExpect(status().isNotFound());
		postAs(schedules(leadB) + "/" + scheduleOfA + "/reschedule", alice, "{\"scheduledAt\":\"2026-12-01T10:00:00Z\"}")
			.andExpect(status().isNotFound());
		// Another user's schedule, through the caller's own lead or the other user's lead.
		getAs(schedules(leadA) + "/" + scheduleOfBob, alice).andExpect(status().isNotFound());
		getAs(schedules(bobsLead) + "/" + scheduleOfBob, alice).andExpect(status().isNotFound()).andExpect(
				jsonPath("$.code").value("lead_not_found"));

		assertThat(column("lead_schedules", scheduleOfA, "title")).isEqualTo("Intro call");
		assertThat(column("lead_schedules", scheduleOfA, "lead_id")).isEqualTo(String.valueOf(leadA));
		// The admin sees every lead's schedules.
		getAs(schedules(bobsLead) + "/" + scheduleOfBob, admin).andExpect(status().isOk());
	}

	@Test
	void assigneesMustBeAbleToSeeTheLead() throws Exception {
		long leadId = createLead(alice);

		postAs(schedules(leadId), alice, VISIT.replace("{", "{\"assignedTo\":" + bobId + ","))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.assignedTo").exists());
		postAs(schedules(leadId), alice, VISIT.replace("{", "{\"assignedTo\":" + aliceId + ","))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.assignedTo.id").value(aliceId));
		// The admin can view every lead, so it can be assigned.
		postAs(schedules(leadId), alice, VISIT.replace("{", "{\"assignedTo\":" + adminId + ","))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.assignedTo.fullName").value("admin"));
	}

	@Test
	void completingAndCancellingFollowTheStatusRules() throws Exception {
		long leadId = createLead(alice);
		long visitId = createSchedule(leadId, alice, VISIT);
		long callId = createSchedule(leadId, alice, CALL);
		String visit = schedules(leadId) + "/" + visitId;

		patchAs(visit, alice, "{\"completionNote\":\"Too early\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.completionNote").exists());
		patchAs(visit, alice, "{\"status\":\"rescheduled\"}").andExpect(status().isBadRequest());
		patchAs(visit, alice, "{\"status\":\"completed\",\"completionNote\":\"Liked tower A\",\"durationMinutes\":45}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("completed"))
			.andExpect(jsonPath("$.completedAt").exists())
			.andExpect(jsonPath("$.durationMinutes").value(45))
			.andExpect(jsonPath("$.completionNote").value("Liked tower A"));
		// A completed activity accepts only a corrected note.
		patchAs(visit, alice, "{\"completionNote\":\"Liked tower B\"}").andExpect(status().isOk())
			.andExpect(jsonPath("$.completionNote").value("Liked tower B"));
		patchAs(visit, alice, "{\"title\":\"Changed\"}").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("lead_schedule_not_editable"));
		patchAs(visit, alice, "{\"status\":\"cancelled\"}").andExpect(status().isConflict());

		patchAs(schedules(leadId) + "/" + callId, alice, "{\"status\":\"cancelled\",\"completionNote\":\"No longer needed\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("cancelled"))
			.andExpect(jsonPath("$.completedAt").value(nullValue()));
		patchAs(schedules(leadId) + "/" + callId, alice, "{\"completionNote\":\"x\"}").andExpect(status().isConflict());
		// The time changes only through reschedule.
		long next = createSchedule(leadId, alice, CALL);
		patchAs(schedules(leadId) + "/" + next, alice, "{\"scheduledAt\":\"2026-12-01T10:00:00Z\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.scheduledAt").value("is not allowed"));
		assertThat(count("SELECT count(*) FROM leads WHERE id = ? AND deleted_at IS NULL", leadId)).isOne();
	}

	@Test
	void reschedulingKeepsTheOriginalRow() throws Exception {
		long leadId = createLead(alice);
		long visitId = createSchedule(leadId, alice, VISIT);

		long replacementId = id(postAs(schedules(leadId) + "/" + visitId + "/reschedule", alice, """
				{"scheduledAt":"2026-11-08T05:00:00Z","reminderAt":"2026-11-08T04:00:00Z","reason":"Customer travelling"}""")
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("pending"))
			.andExpect(jsonPath("$.rescheduledFromId").value(visitId))
			.andExpect(jsonPath("$.title").value("Visit tower A"))
			.andExpect(jsonPath("$.location").value("Baner site office"))
			.andExpect(jsonPath("$.scheduledAt").value("2026-11-08T05:00:00Z")));

		getAs(schedules(leadId) + "/" + visitId, alice)
			.andExpect(jsonPath("$.status").value("rescheduled"))
			.andExpect(jsonPath("$.completionNote").value("Customer travelling"))
			.andExpect(jsonPath("$.scheduledAt").value("2026-11-05T05:00:00Z"));
		postAs(schedules(leadId) + "/" + visitId + "/reschedule", alice, "{\"scheduledAt\":\"2026-11-09T05:00:00Z\"}")
			.andExpect(status().isConflict());
		getAs(schedules(leadId) + "?status=pending", alice)
			.andExpect(jsonPath("$.content[*].id", contains((int) replacementId)));
	}

	@Test
	void aFailedRescheduleChangesNothing() throws Exception {
		long leadId = createLead(alice);
		long visitId = createSchedule(leadId, alice, VISIT);

		postAs(schedules(leadId) + "/" + visitId + "/reschedule", alice,
				"{\"scheduledAt\":\"2026-11-08T05:00:00Z\",\"reminderAt\":\"2026-11-09T05:00:00Z\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.reminderAt").exists());

		assertThat(column("lead_schedules", visitId, "status")).isEqualTo("pending");
		assertThat(count("SELECT count(*) FROM lead_schedules")).isOne();
	}

	@Test
	void deletingAScheduleIsSoftAndKeepsTheLead() throws Exception {
		long leadId = createLead(alice);
		long callId = createSchedule(leadId, alice, CALL);

		deleteAs(schedules(leadId) + "/" + callId, alice).andExpect(status().isNoContent());

		getAs(schedules(leadId) + "/" + callId, alice).andExpect(status().isNotFound());
		getAs(schedules(leadId), alice).andExpect(jsonPath("$.totalElements").value(0));
		assertThat(column("lead_schedules", callId, "deleted_at")).isNotNull();
		getAs(BASE + "/" + leadId, alice).andExpect(status().isOk());
	}

	@Test
	void eachActionNeedsItsSchedulePermission() throws Exception {
		long leadId = createLead(alice);
		long callId = createSchedule(leadId, alice, CALL);
		String call = schedules(leadId) + "/" + callId;

		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead_schedule,delete}' #- '{lead_schedule,update}' "
				+ "WHERE slug = 'user'");
		patchAs(call, alice, "{\"title\":\"x\"}").andExpect(status().isForbidden());
		postAs(call + "/reschedule", alice, "{\"scheduledAt\":\"2026-12-01T10:00:00Z\"}").andExpect(status().isForbidden());
		deleteAs(call, alice).andExpect(status().isForbidden());
		getAs(call, alice).andExpect(status().isOk());

		jdbc.update("UPDATE roles SET permissions = permissions - 'lead_schedule' WHERE slug = 'user'");
		getAs(schedules(leadId), alice).andExpect(status().isForbidden());
		postAs(schedules(leadId), alice, CALL).andExpect(status().isForbidden());
		// Still 404 for leads the caller cannot see, whatever their schedule permissions.
		long bobsLead = createLead(bob);
		getAs(schedules(bobsLead), alice).andExpect(status().isNotFound());
		assertThat(column("lead_schedules", callId, "title")).isEqualTo("Intro call");
	}

}
