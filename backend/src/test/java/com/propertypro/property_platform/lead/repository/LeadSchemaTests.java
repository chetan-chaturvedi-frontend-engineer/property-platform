package com.propertypro.property_platform.lead.repository;

import com.propertypro.property_platform.lead.domain.InteractionOutcome;
import com.propertypro.property_platform.lead.domain.InteractionType;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadInteraction;
import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSchedule;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import com.propertypro.property_platform.lead.domain.ScheduleType;
import com.propertypro.property_platform.property.domain.AreaUnit;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class LeadSchemaTests {

	private static final String PHONE = "+919876543210";

	@Autowired
	private LeadRepository leadRepository;

	@Autowired
	private LeadScheduleRepository scheduleRepository;

	@Autowired
	private LeadInteractionRepository interactionRepository;

	@Autowired
	private JdbcTemplate jdbc;

	private Long agentId;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM lead_interactions");
		jdbc.update("DELETE FROM lead_schedules");
		jdbc.update("DELETE FROM leads");
		agentId = jdbc.queryForObject("INSERT INTO users (email, password_hash, full_name) "
				+ "VALUES ('agent-lead-schema@example.com', 'x', 'Agent') RETURNING id", Long.class);
	}

	@Test
	void defaultsAndOptionalFields() {
		Lead saved = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi Kumar", PHONE));

		assertThat(saved.getStatus()).isEqualTo(LeadStatus.NEW);
		assertThat(saved.getPriority()).isEqualTo(LeadPriority.MEDIUM);
		assertThat(saved.getSource()).isEqualTo(LeadSource.OTHER);
		assertThat(saved.getBudgetCurrency()).isEqualTo("INR");
		assertThat(saved.isLoanRequired()).isFalse();
		assertThat(saved.getCreatedBy()).isNull();
		assertThat(saved.getAssignedTo()).isNull();
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(jdbc.queryForMap("INSERT INTO leads (purpose, lead_name, phone) "
				+ "VALUES ('rent', 'Asha', '+919800000000') RETURNING status, priority, source, budget_currency, loan_required"))
			.containsEntry("status", "new")
			.containsEntry("priority", "medium")
			.containsEntry("source", "other")
			.containsEntry("budget_currency", "INR")
			.containsEntry("loan_required", false);
	}

	@Test
	void storesFullRequirementWithEnumValuesAndJsonAmenities() {
		Lead lead = new Lead(agentId, LeadPurpose.BUY, "Ravi Kumar", PHONE);
		lead.setAssignedTo(agentId);
		lead.setSource(LeadSource.WALK_IN);
		lead.setStatus(LeadStatus.SITE_VISIT_SCHEDULED);
		lead.setPropertyType(LeadPropertyType.INDEPENDENT_HOUSE);
		lead.setBhk("2.5");
		lead.setBudgetMin(new BigDecimal("5000000"));
		lead.setBudgetMax(new BigDecimal("7500000"));
		lead.setArea(new BigDecimal("1200"));
		lead.setAreaUnit(AreaUnit.SQ_FT);
		lead.setAmenities(List.of("swimming-pool", "gymnasium"));
		lead.setLoanRequired(true);
		Long id = leadRepository.saveAndFlush(lead).getId();

		assertThat(jdbc.queryForMap("SELECT source, status, property_type, area_unit, amenities::text AS amenities "
				+ "FROM leads WHERE id = ?", id))
			.containsEntry("source", "walk_in")
			.containsEntry("status", "site_visit_scheduled")
			.containsEntry("property_type", "independent_house")
			.containsEntry("area_unit", "sq_ft")
			.containsEntry("amenities", "[\"swimming-pool\", \"gymnasium\"]");
	}

	@Test
	void phoneAndEmailAreNotUnique() {
		Lead first = new Lead(null, LeadPurpose.BUY, "Ravi", PHONE);
		first.setEmail("ravi@example.com");
		Lead second = new Lead(null, LeadPurpose.RENT, "Ravi", PHONE);
		second.setEmail("ravi@example.com");
		leadRepository.saveAndFlush(first);
		leadRepository.saveAndFlush(second);

		assertThat(leadRepository.findTop10ByPhoneOrderByCreatedAtDesc(PHONE)).hasSize(2);
	}

	@Test
	void entityValidationRejectsBudgetMinAboveMax() {
		Lead lead = new Lead(null, LeadPurpose.BUY, "Ravi", PHONE);
		lead.setBudgetMin(new BigDecimal("200"));
		lead.setBudgetMax(new BigDecimal("100"));

		assertThatThrownBy(() -> leadRepository.saveAndFlush(lead)).isInstanceOf(ConstraintViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"status = 'closed'",
			"source = 'tv'",
			"priority = 'critical'",
			"purpose = NULL",
			"lead_name = '  '",
			"phone = '9876543210'",
			"phone = NULL",
			"alternate_phone = '12345'",
			"property_type = 'castle'",
			"bhk = '2 BHK'",
			"bhk = '0'",
			"budget_min = 200, budget_max = 100",
			"budget_min = -1",
			"budget_currency = 'inr'",
			"area = 100",
			"area = 0, area_unit = 'sq_ft'",
			"area_unit = 'sq_yd'",
			"possession = 'soon'",
			"facing = 'up'",
			"furnishing = 'fully'",
			"parking = 'car'",
			"amenities = '{\"pool\": true}'",
			"created_by = -1",
			"assigned_to = -1"
	})
	void leadsRejectInvalidRows(String assignment) {
		Long id = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE leads SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void schedulesKeepHistoryWhenRescheduled() {
		Long leadId = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();
		Instant at = Instant.now().truncatedTo(ChronoUnit.SECONDS).plus(1, ChronoUnit.DAYS);
		LeadSchedule visit = new LeadSchedule(leadId, agentId, ScheduleType.SITE_VISIT, "Visit tower A", at);
		visit.setAssignedTo(agentId);
		visit.setReminderAt(at.minus(1, ChronoUnit.HOURS));
		scheduleRepository.saveAndFlush(visit);

		LeadSchedule moved = scheduleRepository.saveAndFlush(
				visit.rescheduleTo(at.plus(2, ChronoUnit.DAYS), null, agentId, "Customer travelling"));
		scheduleRepository.saveAndFlush(visit);

		assertThat(scheduleRepository.findById(visit.getId())).get()
			.extracting(LeadSchedule::getStatus).isEqualTo(ScheduleStatus.RESCHEDULED);
		assertThat(moved.getRescheduledFromId()).isEqualTo(visit.getId());
		assertThat(moved.getAssignedTo()).isEqualTo(agentId);
		assertThat(scheduleRepository.findByLeadId(leadId, PageRequest.of(0, 10))).hasSize(2);
		assertThatThrownBy(() -> jdbc.update("INSERT INTO lead_schedules "
				+ "(lead_id, schedule_type, title, scheduled_at, rescheduled_from_id) VALUES (?, 'call', 'Again', now(), ?)",
				leadId, visit.getId()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void completingSetsCompletedAt() {
		Long leadId = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();
		// Past schedules are allowed.
		LeadSchedule call = new LeadSchedule(leadId, null, ScheduleType.CALL, "Intro call",
				Instant.now().minus(1, ChronoUnit.DAYS));
		scheduleRepository.saveAndFlush(call);
		call.complete(Instant.now(), "Interested in 2 BHK");
		scheduleRepository.saveAndFlush(call);

		assertThat(jdbc.queryForMap("SELECT status, completed_at IS NOT NULL AS done FROM lead_schedules WHERE id = ?",
				call.getId()))
			.containsEntry("status", "completed")
			.containsEntry("done", true);
		assertThatThrownBy(() -> call.cancel(null)).isInstanceOf(IllegalStateException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"schedule_type = 'lunch'",
			"status = 'done'",
			"status = 'completed'",
			"completed_at = now()",
			"title = ''",
			"duration_minutes = 0",
			"duration_minutes = 1441",
			"reminder_at = scheduled_at + interval '1 minute'",
			"scheduled_at = NULL",
			"lead_id = -1",
			"rescheduled_from_id = id"
	})
	void schedulesRejectInvalidRows(String assignment) {
		Long leadId = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();
		Long id = scheduleRepository.saveAndFlush(
				new LeadSchedule(leadId, null, ScheduleType.CALL, "Call", Instant.now())).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE lead_schedules SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void interactionsAreListedByWhenTheyHappened() {
		Long leadId = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();
		Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
		LeadInteraction older = new LeadInteraction(leadId, agentId, InteractionType.CALL, now.minus(3, ChronoUnit.DAYS));
		older.setOutcome(InteractionOutcome.NO_ANSWER);
		older.setDurationSeconds(0);
		LeadInteraction newer = new LeadInteraction(leadId, agentId, InteractionType.WHATSAPP, now.minus(1, ChronoUnit.DAYS));
		newer.setOutcome(InteractionOutcome.FOLLOW_UP_REQUIRED);
		// Recorded after the newer one, although it happened earlier.
		interactionRepository.saveAndFlush(newer);
		interactionRepository.saveAndFlush(older);

		assertThat(interactionRepository.findByLeadId(leadId,
				PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "interactionAt"))))
			.extracting(LeadInteraction::getId)
			.containsExactly(newer.getId(), older.getId());
		assertThat(jdbc.queryForObject("SELECT outcome FROM lead_interactions WHERE id = ?", String.class, newer.getId()))
			.isEqualTo("follow_up_required");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"type = 'fax'",
			"type = NULL",
			"outcome = 'maybe'",
			"interaction_at = NULL",
			"duration_seconds = -1",
			"lead_id = -1",
			"interacted_by = -1"
	})
	void interactionsRejectInvalidRows(String assignment) {
		Long leadId = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE)).getId();
		Long id = interactionRepository.saveAndFlush(
				new LeadInteraction(leadId, null, InteractionType.NOTE, Instant.now())).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE lead_interactions SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void softDeletingALeadKeepsItsHistoryAndHardDeleteIsBlocked() {
		Lead lead = leadRepository.saveAndFlush(new Lead(null, LeadPurpose.BUY, "Ravi", PHONE));
		scheduleRepository.saveAndFlush(new LeadSchedule(lead.getId(), null, ScheduleType.CALL, "Call", Instant.now()));
		interactionRepository.saveAndFlush(new LeadInteraction(lead.getId(), null, InteractionType.NOTE, Instant.now()));

		leadRepository.delete(lead);
		leadRepository.flush();

		assertThat(leadRepository.findById(lead.getId())).isEmpty();
		assertThat(jdbc.queryForObject("SELECT deleted_at IS NOT NULL FROM leads WHERE id = ?", Boolean.class,
				lead.getId())).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM lead_schedules WHERE lead_id = ?", Integer.class,
				lead.getId())).isOne();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM lead_interactions WHERE lead_id = ?", Integer.class,
				lead.getId())).isOne();
		assertThatThrownBy(() -> jdbc.update("DELETE FROM leads WHERE id = ?", lead.getId()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void purgingAUserUnassignsButKeepsAuthorship() {
		Long otherId = jdbc.queryForObject("INSERT INTO users (email, password_hash, full_name) "
				+ "VALUES ('other-lead-schema@example.com', 'x', 'Other') RETURNING id", Long.class);
		Lead lead = new Lead(agentId, LeadPurpose.BUY, "Ravi", PHONE);
		lead.setAssignedTo(otherId);
		Long leadId = leadRepository.saveAndFlush(lead).getId();

		jdbc.update("DELETE FROM users WHERE id = ?", otherId);

		assertThat(jdbc.queryForObject("SELECT assigned_to FROM leads WHERE id = ?", Long.class, leadId)).isNull();
		assertThatThrownBy(() -> jdbc.update("DELETE FROM users WHERE id = ?", agentId))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void createsTheIndexes() {
		assertThat(indexes("leads")).containsExactlyInAnyOrder("leads_pkey", "idx_leads_phone", "idx_leads_email",
				"idx_leads_assigned_to_status", "idx_leads_created_by", "idx_leads_status_created_at",
				"idx_leads_created_at", "idx_leads_next_follow_up_at");
		assertThat(indexes("lead_schedules")).containsExactlyInAnyOrder("lead_schedules_pkey",
				"uq_lead_schedules_rescheduled_from_id", "idx_lead_schedules_lead_id_scheduled_at",
				"idx_lead_schedules_assigned_to_scheduled_at", "idx_lead_schedules_created_by",
				"idx_lead_schedules_status_scheduled_at", "idx_lead_schedules_reminder_at");
		assertThat(indexes("lead_interactions")).containsExactlyInAnyOrder("lead_interactions_pkey",
				"idx_lead_interactions_lead_id_interaction_at", "idx_lead_interactions_interacted_by_interaction_at");
	}

	@Test
	void rollbacksDropOnlyLeadTablesInReverseOrderAndMigrationsReapply() {
		leadRepository.saveAndFlush(new Lead(agentId, LeadPurpose.BUY, "Ravi", PHONE));
		int users = jdbc.queryForObject("SELECT count(*) FROM users", Integer.class);

		jdbc.execute(script("db/rollback/U202610261420__create_lead_interactions.sql"));
		jdbc.execute(script("db/rollback/U202610261410__create_lead_schedules.sql"));
		jdbc.execute(script("db/rollback/U202610261400__create_leads.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('leads') IS NULL AND to_regclass('lead_schedules') IS NULL "
				+ "AND to_regclass('lead_interactions') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history "
				+ "WHERE version IN ('202610261400', '202610261410', '202610261420')", Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(users);

		jdbc.execute(script("db/migration/V202610261400__create_leads.sql"));
		jdbc.execute(script("db/migration/V202610261410__create_lead_schedules.sql"));
		jdbc.execute(script("db/migration/V202610261420__create_lead_interactions.sql"));

		assertThat(jdbc.queryForObject("SELECT count(*) FROM leads", Integer.class)).isZero();
	}

	@Test
	void permissionGrantRollbackRemovesOnlyItsKeysAndReapplies() {
		String userRole = "SELECT permissions::text FROM roles WHERE slug = 'user'";
		String adminLead = "SELECT (permissions -> 'lead')::text FROM roles WHERE slug = 'admin'";
		String others = "SELECT (permissions - 'lead' - 'lead_schedule' - 'lead_interaction')::text FROM roles "
				+ "WHERE slug = 'admin'";
		String granted = jdbc.queryForObject(userRole, String.class);
		String adminOthers = jdbc.queryForObject(others, String.class);

		jdbc.execute(script("db/rollback/U202610261430__grant_lead_permissions.sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'lead_schedule' "
				+ "OR permissions ? 'lead_interaction'", String.class)).isEmpty();
		assertThat(jdbc.queryForObject(adminLead, String.class)).doesNotContain("assign", "\"create\"")
			.contains("view_any");
		assertThat(jdbc.queryForObject(userRole, String.class)).contains("\"lead\"");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(adminOthers);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610261430'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610261430__grant_lead_permissions.sql"));
		assertThat(jdbc.queryForObject(userRole, String.class)).isEqualTo(granted);
		assertThat(jdbc.queryForObject(adminLead, String.class)).contains("\"assign\": true", "\"create\": true");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(adminOthers);
	}

	private List<String> indexes(String table) {
		return jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = ?", String.class, table);
	}

	private static String script(String path) {
		try {
			return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
		}
		catch (IOException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
