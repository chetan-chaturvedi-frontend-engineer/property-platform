package com.propertypro.property_platform.cms.faq;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Public FAQ endpoints without login. Categories come from application.yml (general, billing,
 * technical); "removed_category" stands for a key that was removed from the configuration.
 */
class PublicFaqApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/public/faqs";

	@BeforeEach
	void insertFaqs() {
		jdbc.execute("TRUNCATE faqs RESTART IDENTITY");
		insert("Refunds?", "billing", "publish", 2);         // 1
		insert("Secret draft?", "general", "draft", 0);      // 2
		insert("Is the app free?", "general", "publish", 1); // 3
		insert("Contact support?", "general", "publish", 1); // 4
		insert("Orphan?", "removed_category", "publish", 0); // 5
		insert("Draft billing?", "billing", "draft", 0);     // 6
	}

	@Test
	void listsOnlyPublishedFaqsOfConfiguredCategoriesInDisplayOrder() throws Exception {
		list("")
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.content[*].id", contains(3, 4, 1)))
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(1))
			.andExpect(jsonPath("$.content[0].question").value("Is the app free?"))
			.andExpect(jsonPath("$.content[0].answer").value("<p>Answer to Is the app free?</p>"))
			.andExpect(jsonPath("$.content[0].category").value("general"))
			.andExpect(jsonPath("$.content[0].categoryLabel").value("General"))
			.andExpect(jsonPath("$.content[0].sortOrder").value(1));
	}

	@Test
	void responsesContainNoAdminFields() throws Exception {
		for (String path : new String[] { "$.content[0]", "$" }) {
			ResultActions result = path.equals("$") ? mvc.perform(get(BASE + "/3")) : list("");
			result.andExpect(jsonPath(path + ".status").doesNotExist())
				.andExpect(jsonPath(path + ".createdAt").doesNotExist())
				.andExpect(jsonPath(path + ".updatedAt").doesNotExist());
		}
	}

	@Test
	void paginatesDeterministicallyAndCountsOnlyVisibleFaqs() throws Exception {
		list("?size=2&page=0")
			.andExpect(jsonPath("$.content[*].id", contains(3, 4)))
			.andExpect(jsonPath("$.totalElements").value(3))
			.andExpect(jsonPath("$.totalPages").value(2));
		list("?size=2&page=1").andExpect(jsonPath("$.content[*].id", contains(1)));
		list("?size=2&page=5").andExpect(jsonPath("$.content", hasSize(0)));
		list("?size=1000").andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void filtersByCategoryWithinPublishedFaqsOnly() throws Exception {
		list("?category=general").andExpect(jsonPath("$.content[*].id", contains(3, 4)));
		list("?category=billing").andExpect(jsonPath("$.content[*].id", contains(1)));
		list("?category=technical").andExpect(jsonPath("$.content", hasSize(0)));
		list("?category=removed_category")
			.andExpect(jsonPath("$.content", hasSize(0)))
			.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void searchesWithinPublishedFaqsOnly() throws Exception {
		list("?search=draft").andExpect(jsonPath("$.content", hasSize(0)));
		list("?search=SUPPORT").andExpect(jsonPath("$.content[*].id", contains(4)));
		mvc.perform(get(BASE).param("search", "answer to").param("category", "general"))
			.andExpect(jsonPath("$.content[*].id", contains(3, 4)));
		list("?search=orphan").andExpect(jsonPath("$.content", hasSize(0)));
	}

	@Test
	void clientsCannotChangeVisibilityOrOrder() throws Exception {
		list("?status=draft&includeDrafts=true&sort=id,desc")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].id", contains(3, 4, 1)));
	}

	@ParameterizedTest
	@ValueSource(strings = { "category=Bad%20Key", "category=general'--", "category=%3Cscript%3E" })
	void rejectsMalformedCategory(String query) throws Exception {
		list("?" + query)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.category").exists());
	}

	@Test
	void rejectsTooLongSearch() throws Exception {
		mvc.perform(get(BASE).param("search", "a".repeat(101)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.search").exists());
	}

	@Test
	void detailReturnsPublishedFaqOnly() throws Exception {
		mvc.perform(get(BASE + "/3"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.id").value(3))
			.andExpect(jsonPath("$.question").value("Is the app free?"))
			.andExpect(jsonPath("$.categoryLabel").value("General"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "2", "6", "5", "999" })
	void draftsOrphansAndUnknownIdsAreIndistinguishable404s(String id) throws Exception {
		mvc.perform(get(BASE + "/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("faq_not_found"))
			.andExpect(jsonPath("$.detail").value("FAQ not found."));
	}

	@Test
	void unpublishingHidesTheFaqImmediately() throws Exception {
		jdbc.update("UPDATE faqs SET status = 'draft' WHERE id = 3");
		mvc.perform(get(BASE + "/3")).andExpect(status().isNotFound());
		list("").andExpect(jsonPath("$.content[*].id", contains(4, 1)));
	}

	@Test
	void listsConfiguredCategoriesInOrder() throws Exception {
		mvc.perform(get("/api/v1/public/faq-categories"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$[*].key", contains("general", "billing", "technical")))
			.andExpect(jsonPath("$[*].label", contains("General", "Billing & Payments", "Technical Support")));
	}

	@Test
	void writesArePublicOnlyForGet() throws Exception {
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
		mvc.perform(patch(BASE + "/3").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(BASE + "/3")).andExpect(status().isUnauthorized());
	}

	private ResultActions list(String query) throws Exception {
		return mvc.perform(get(BASE + query.replace("'", "%27")));
	}

	private void insert(String question, String category, String status, int sortOrder) {
		jdbc.update("""
				INSERT INTO faqs (question, answer, category, status, sort_order)
				VALUES (?, '<p>Answer to ' || ? || '</p>', ?, ?, ?)""", question, question, category, status, sortOrder);
	}

}
