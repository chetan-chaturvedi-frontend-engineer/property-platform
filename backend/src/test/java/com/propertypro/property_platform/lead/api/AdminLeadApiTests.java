package com.propertypro.property_platform.lead.api;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The admin dashboard's lead endpoints under {@code /api/v1/admin/leads}: the same service as
 * {@code /api/v1/leads}, reachable with the dashboard's cookie session.
 */
class AdminLeadApiTests extends LeadApiTestSupport {

	private static final String ADMIN_BASE = "/api/v1/admin/leads";

	@Test
	void statsCountNonDeletedLeadsPerStatusAndSource() throws Exception {
		createLead(alice, LEAD.replace("}", ",\"source\":\"website\"}"));
		createLead(alice, LEAD.replace("}", ",\"source\":\"website\",\"status\":\"contacted\"}"));
		long deleted = createLead(bob);
		deleteAs(BASE + "/" + deleted, bob).andExpect(status().isNoContent());

		getAs(ADMIN_BASE + "/stats", admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.total").value(2))
			.andExpect(jsonPath("$.byStatus.new").value(1))
			.andExpect(jsonPath("$.byStatus.contacted").value(1))
			.andExpect(jsonPath("$.byStatus.converted").value(0))
			.andExpect(jsonPath("$.bySource.website").value(2))
			.andExpect(jsonPath("$.bySource.other").value(0));
	}

	@Test
	void statsNeedListAnyAndTheAdminPanel() throws Exception {
		getAs(ADMIN_BASE + "/stats", alice).andExpect(status().isForbidden());
		role("auditor", "\"lead\": {\"view_any\": true}");
		account("auditor@example.com", "auditor");
		getAs(ADMIN_BASE + "/stats", token("auditor@example.com")).andExpect(status().isForbidden());
		mvc.perform(get(ADMIN_BASE + "/stats")).andExpect(status().isUnauthorized());
	}

	@Test
	void adminCreatesViewsUpdatesAssignsAndDeletesAnyLead() throws Exception {
		long aliceLead = createLead(alice);

		getAs(ADMIN_BASE + "/" + aliceLead, admin)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.leadName").value("Ravi Kumar"))
			.andExpect(jsonPath("$.createdBy.id").value(aliceId));

		patchAs(ADMIN_BASE + "/" + aliceLead, admin, "{\"status\":\"lost\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.lostReason").exists());
		patchAs(ADMIN_BASE + "/" + aliceLead, admin, "{\"status\":\"qualified\",\"priority\":\"high\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("qualified"))
			.andExpect(jsonPath("$.priority").value("high"));

		patchAs(ADMIN_BASE + "/" + aliceLead + "/assign", admin, "{\"assignedTo\":" + adminId + "}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignedTo.id").value(adminId));
		patchAs(ADMIN_BASE + "/" + aliceLead + "/assign", admin, "{\"assignedTo\":" + bobId + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.assignedTo").exists());
		patchAs(ADMIN_BASE + "/" + aliceLead + "/assign", admin, "{\"assignedTo\":null}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.assignedTo").value(nullValue()));

		long created = id(postAs(ADMIN_BASE, admin, LEAD).andExpect(status().isCreated())
			.andExpect(jsonPath("$.createdBy.id").value(adminId)));

		deleteAs(ADMIN_BASE + "/" + aliceLead, admin).andExpect(status().isNoContent());
		getAs(ADMIN_BASE + "/" + aliceLead, admin).andExpect(status().isNotFound());
		getAs(ADMIN_BASE + "/" + created, admin).andExpect(status().isOk());
	}

	@Test
	void appUsersCannotUseTheAdminRoutes() throws Exception {
		long aliceLead = createLead(alice);

		getAs(ADMIN_BASE + "/" + aliceLead, alice).andExpect(status().isForbidden());
		postAs(ADMIN_BASE, alice, LEAD).andExpect(status().isForbidden());
		patchAs(ADMIN_BASE + "/" + aliceLead, alice, "{}").andExpect(status().isForbidden());
		deleteAs(ADMIN_BASE + "/" + aliceLead, alice).andExpect(status().isForbidden());
		mvc.perform(get(ADMIN_BASE + "/" + aliceLead)).andExpect(status().isUnauthorized());
	}

	@Test
	void staffWithoutTheAnyPermissionsGetNotFoundForOthersLeads() throws Exception {
		long aliceLead = createLead(alice);
		role("viewer", "\"lead\": {\"view\": true, \"create\": true}");
		account("viewer@example.com", "viewer");
		String viewer = token("viewer@example.com");

		getAs(ADMIN_BASE + "/" + aliceLead, viewer).andExpect(status().isNotFound());
		long own = id(postAs(ADMIN_BASE, viewer, LEAD).andExpect(status().isCreated()));
		getAs(ADMIN_BASE + "/" + own, viewer).andExpect(status().isOk());
		patchAs(ADMIN_BASE + "/" + own, viewer, "{\"priority\":\"high\"}").andExpect(status().isForbidden());
	}

	@Test
	void validationMatchesTheAppEndpoint() throws Exception {
		postAs(ADMIN_BASE, admin, "{\"leadName\":\"\",\"phone\":\"12\",\"purpose\":\"buy\"}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("validation_failed"))
			.andExpect(jsonPath("$.errors.leadName").exists())
			.andExpect(jsonPath("$.errors.phone").exists());
		postAs(ADMIN_BASE, admin, LEAD.replace("{", "{\"createdBy\":1,"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.createdBy").value("is not allowed"));
	}

	@Test
	void cookieSessionReachesTheRoutesAndWritesNeedTheCsrfToken() throws Exception {
		Cookie session = new Cookie(ADMIN_ACCESS_COOKIE, admin);
		long leadId = createLead(alice);

		mvc.perform(get(ADMIN_BASE + "/" + leadId).cookie(session)).andExpect(status().isOk());
		mvc.perform(patch(ADMIN_BASE + "/" + leadId).cookie(session)
				.contentType(MediaType.APPLICATION_JSON).content("{\"priority\":\"low\"}"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("csrf_invalid"));
		mvc.perform(withCsrf(patch(ADMIN_BASE + "/" + leadId)).cookie(session)
				.contentType(MediaType.APPLICATION_JSON).content("{\"priority\":\"low\"}"))
			.andExpect(status().isOk());
		mvc.perform(withCsrf(post(ADMIN_BASE)).cookie(session).contentType(MediaType.APPLICATION_JSON).content(LEAD))
			.andExpect(status().isCreated());
		mvc.perform(withCsrf(delete(ADMIN_BASE + "/" + leadId)).cookie(session)).andExpect(status().isNoContent());
	}

}
