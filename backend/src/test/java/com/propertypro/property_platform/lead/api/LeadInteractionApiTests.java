package com.propertypro.property_platform.lead.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LeadInteractionApiTests extends LeadApiTestSupport {

	private static final String CALL = """
			{"type":"call","note":"Discussed budget","interactionAt":"2026-10-20T10:00:00Z","outcome":"interested",
			 "nextFollowUpAt":"2026-10-25T10:00:00Z","durationSeconds":180}""";
	private static final String WHATSAPP = """
			{"type":"whatsapp","interactionAt":"2026-10-22T08:00:00Z","outcome":"follow_up_required"}""";

	private String interactions(long leadId) {
		return BASE + "/" + leadId + "/interactions";
	}

	@Test
	void recordsTheActorFromTheTokenAndUpdatesTheLead() throws Exception {
		long leadId = createLead(alice);

		postAs(interactions(leadId), alice, CALL)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.interactedBy.id").value(aliceId))
			.andExpect(jsonPath("$.interactionAt").value("2026-10-20T10:00:00Z"))
			.andExpect(jsonPath("$.outcome").value("interested"))
			.andExpect(jsonPath("$.durationSeconds").value(180));

		getAs(BASE + "/" + leadId, alice)
			.andExpect(jsonPath("$.lastContactedAt").value("2026-10-20T10:00:00Z"))
			.andExpect(jsonPath("$.nextFollowUpAt").value("2026-10-25T10:00:00Z"))
			// Outcomes never change the pipeline status.
			.andExpect(jsonPath("$.status").value("new"));
	}

	@Test
	void historyIsSortedByWhenInteractionsHappened() throws Exception {
		long leadId = createLead(alice);
		// Recorded out of order.
		createInteraction(leadId, alice, WHATSAPP);
		createInteraction(leadId, alice, CALL);
		createInteraction(leadId, alice, """
				{"type":"note","note":"Prefers evening calls","interactionAt":"2026-10-23T08:00:00Z"}""");

		getAs(interactions(leadId), alice)
			.andExpect(jsonPath("$.content[*].type", contains("note", "whatsapp", "call")));
		getAs(interactions(leadId) + "?sort=interactionAt,asc", alice)
			.andExpect(jsonPath("$.content[*].type", contains("call", "whatsapp", "note")));
		getAs(interactions(leadId) + "?type=call", alice).andExpect(jsonPath("$.totalElements").value(1));
		getAs(interactions(leadId) + "?sort=note", alice).andExpect(status().isBadRequest());
		getAs(interactions(leadId) + "?type=fax", alice).andExpect(status().isBadRequest());
		// Notes are internal: the latest contact is the WhatsApp message.
		assertThat(column("leads", leadId, "last_contacted_at")).startsWith("2026-10-22");
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = {
			"{\"type\":\"call\",\"interactionAt\":\"2026-10-20T10:00:00Z\",\"interactedBy\":1} | interactedBy",
			"{\"type\":\"call\",\"interactionAt\":\"2026-10-20T10:00:00Z\",\"createdAt\":\"2026-10-20T10:00:00Z\"} | createdAt",
			"{\"type\":\"fax\",\"interactionAt\":\"2026-10-20T10:00:00Z\"} | type",
			"{\"interactionAt\":\"2026-10-20T10:00:00Z\"} | type",
			"{\"type\":\"call\",\"interactionAt\":\"2026-10-20T10:00:00Z\",\"outcome\":\"maybe\"} | outcome",
			"{\"type\":\"call\"} | interactionAt",
			"{\"type\":\"call\",\"interactionAt\":\"20/10/2026\"} | interactionAt",
			"{\"type\":\"call\",\"interactionAt\":\"2999-01-01T00:00:00Z\"} | interactionAt",
			"{\"type\":\"call\",\"interactionAt\":\"2026-10-20T10:00:00Z\",\"durationSeconds\":-1} | durationSeconds",
			"{\"type\":\"call\",\"interactionAt\":\"2026-10-20T10:00:00Z\",\"nextFollowUpAt\":\"2026-10-19T10:00:00Z\"} | nextFollowUpAt",
			"{\"type\":\"note\",\"interactionAt\":\"2026-10-20T10:00:00Z\"} | note" })
	void invalidInteractionsChangeNothing(String body, String errorField) throws Exception {
		long leadId = createLead(alice);

		postAs(interactions(leadId), alice, body)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + errorField).exists());
		assertThat(count("SELECT count(*) FROM lead_interactions")).isZero();
		assertThat(column("leads", leadId, "last_contacted_at")).isNull();
		assertThat(column("leads", leadId, "next_follow_up_at")).isNull();
	}

	@Test
	void interactionsJustNowAreAcceptedDespiteClockSkew() throws Exception {
		long leadId = createLead(alice);
		Instant soon = Instant.now().plus(2, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.SECONDS);

		postAs(interactions(leadId), alice, "{\"type\":\"call\",\"interactionAt\":\"" + soon + "\"}")
			.andExpect(status().isCreated());
	}

	@Test
	void updatesAndDeletesRecomputeLastContact() throws Exception {
		long leadId = createLead(alice);
		long callId = createInteraction(leadId, alice, CALL);
		long whatsappId = createInteraction(leadId, alice, WHATSAPP);
		assertThat(column("leads", leadId, "last_contacted_at")).startsWith("2026-10-22");

		patchAs(interactions(leadId) + "/" + callId, alice,
				"{\"interactionAt\":\"2026-10-24T10:00:00Z\",\"nextFollowUpAt\":\"2026-10-30T10:00:00Z\",\"note\":null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.interactedBy.id").value(aliceId))
			.andExpect(jsonPath("$.note").doesNotExist());
		assertThat(column("leads", leadId, "last_contacted_at")).startsWith("2026-10-24");
		assertThat(column("leads", leadId, "next_follow_up_at")).startsWith("2026-10-30");

		patchAs(interactions(leadId) + "/" + callId, admin, "{\"interactedBy\":" + adminId + "}")
			.andExpect(status().isBadRequest());
		patchAs(interactions(leadId) + "/" + callId, alice, "{\"nextFollowUpAt\":\"2026-10-01T00:00:00Z\"}")
			.andExpect(status().isBadRequest());

		deleteAs(interactions(leadId) + "/" + callId, alice).andExpect(status().isNoContent());
		assertThat(column("leads", leadId, "last_contacted_at")).startsWith("2026-10-22");
		deleteAs(interactions(leadId) + "/" + whatsappId, alice).andExpect(status().isNoContent());
		assertThat(column("leads", leadId, "last_contacted_at")).isNull();
		assertThat(column("lead_interactions", callId, "deleted_at")).isNotNull();
		assertThat(column("lead_interactions", callId, "interacted_by")).isEqualTo(String.valueOf(aliceId));
	}

	@Test
	void interactionsAreOnlyReachableThroughTheirOwnLead() throws Exception {
		long leadA = createLead(alice);
		long leadB = createLead(alice);
		long bobsLead = createLead(bob);
		long interactionOfA = createInteraction(leadA, alice, CALL);
		long interactionOfBob = createInteraction(bobsLead, bob, CALL);

		getAs(interactions(leadB) + "/" + interactionOfA, alice).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("lead_interaction_not_found"));
		patchAs(interactions(leadB) + "/" + interactionOfA, alice, "{\"note\":\"x\"}").andExpect(status().isNotFound());
		deleteAs(interactions(leadB) + "/" + interactionOfA, alice).andExpect(status().isNotFound());
		getAs(interactions(leadA) + "/" + interactionOfBob, alice).andExpect(status().isNotFound());
		getAs(interactions(bobsLead), alice).andExpect(status().isNotFound());
		patchAs(interactions(bobsLead) + "/" + interactionOfBob, alice, "{\"note\":\"x\"}").andExpect(status().isNotFound());

		assertThat(column("lead_interactions", interactionOfA, "note")).isEqualTo("Discussed budget");
		assertThat(column("lead_interactions", interactionOfBob, "note")).isEqualTo("Discussed budget");
		getAs(interactions(bobsLead), admin).andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	void eachActionNeedsItsInteractionPermission() throws Exception {
		long leadId = createLead(alice);
		long callId = createInteraction(leadId, alice, CALL);

		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead_interaction,create}' "
				+ "#- '{lead_interaction,update}' #- '{lead_interaction,delete}' WHERE slug = 'user'");
		postAs(interactions(leadId), alice, CALL).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("lead_action_forbidden"));
		patchAs(interactions(leadId) + "/" + callId, alice, "{\"note\":\"x\"}").andExpect(status().isForbidden());
		deleteAs(interactions(leadId) + "/" + callId, alice).andExpect(status().isForbidden());
		getAs(interactions(leadId), alice).andExpect(status().isOk());

		jdbc.update("UPDATE roles SET permissions = permissions #- '{lead_interaction,view}' WHERE slug = 'user'");
		getAs(interactions(leadId), alice).andExpect(status().isForbidden());
		getAs(interactions(leadId) + "/" + callId, alice).andExpect(status().isForbidden());
		assertThat(count("SELECT count(*) FROM lead_interactions WHERE deleted_at IS NULL")).isOne();
	}

}
