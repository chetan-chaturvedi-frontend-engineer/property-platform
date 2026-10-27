package com.propertypro.property_platform.lead.api;

import java.time.LocalDate;
import java.time.ZoneId;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Site visit API tests on top of the lead test accounts: Alice and Bob are app users (seeded
 * {@code user} role), Admin has the seeded {@code admin} role. Properties are inserted directly.
 */
abstract class SiteVisitApiTestSupport extends LeadApiTestSupport {

	static final String APP = "/api/v1/site-visits";
	static final String ADMIN = "/api/v1/admin/site-visits";
	static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
	/** The app permissions plus access to assigned visits: a field agent. */
	static final String AGENT_MODULES = """
			"site_visit": {"list": true, "view": true, "update": true, "update_status": true,
			"submit_report": true, "access_assigned": true}""";

	static LocalDate today() {
		return LocalDate.now(ZONE);
	}

	static LocalDate tomorrow() {
		return today().plusDays(1);
	}

	static String booking(long propertyId) {
		return booking(propertyId, tomorrow(), "10:30");
	}

	static String booking(long propertyId, LocalDate date, String time) {
		return """
				{"propertyId": %d, "visitDate": "%s", "visitTime": "%s", "name": "Ravi Kumar",
				 "mobile": "98765 43210", "email": "Ravi@Example.com", "numberOfPeople": 3}"""
			.formatted(propertyId, date, time);
	}

	/** A property owned by {@code ownerId} in the given publication status. */
	long property(long ownerId, String publicationStatus) {
		return jdbc.queryForObject("""
				INSERT INTO property_projects (user_id, slug, property_type, project_name, builder_company_name,
				    project_email, project_phone, city, locality, publication_status)
				VALUES (?, ?, 'villa', 'Green Acres', 'Builder', 'a@example.com', '+919876543210', 'Pune', 'Baner', ?)
				RETURNING id""", Long.class, ownerId, "project-" + System.nanoTime(), publicationStatus);
	}

	long book(String token, long propertyId) throws Exception {
		return id(postAs(APP, token, booking(propertyId)).andExpect(status().isCreated()));
	}

	/** An agent account whose role can work on visits assigned to it; returns its id. */
	long agent(String email) {
		if (count("SELECT count(*) FROM roles WHERE slug = 'agent'") == 0) {
			role("agent", AGENT_MODULES);
		}
		return account(email, "agent");
	}

	/** Moves the visit to today, so it can be completed or marked no-show. */
	void dueToday(long visitId) {
		jdbc.update("UPDATE site_visits SET visit_date = ?, visit_time = '00:00' WHERE id = ?", today(), visitId);
	}

	String path(long visitId) {
		return APP + "/" + visitId;
	}

	String adminPath(long visitId) {
		return ADMIN + "/" + visitId;
	}

}
