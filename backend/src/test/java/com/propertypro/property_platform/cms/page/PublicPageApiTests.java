package com.propertypro.property_platform.cms.page;

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
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public page endpoints without login: published pages only. */
class PublicPageApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/public/pages";

	@BeforeEach
	void insertPages() {
		jdbc.execute("TRUNCATE pages RESTART IDENTITY");
		insert("Terms", "terms", "system", "publish");             // 1
		insert("Secret launch", "secret-launch", "static", "draft"); // 2
		insert("About us", "about-us", "static", "publish");       // 3
		insert("Draft system", "draft-system", "system", "draft"); // 4
		jdbc.update("""
				UPDATE pages SET sub_heading = 'Who we are', meta_title = 'About | PropertyPro',
				    meta_description = 'Our story.', meta_keywords = 'about, company' WHERE id = 3""");
	}

	@Test
	void detailReturnsPublishedPageWithSeoFieldsOnly() throws Exception {
		mvc.perform(get(BASE + "/about-us"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.heading").value("About us"))
			.andExpect(jsonPath("$.subHeading").value("Who we are"))
			.andExpect(jsonPath("$.slug").value("about-us"))
			.andExpect(jsonPath("$.content").value("<p>Body of About us</p>"))
			.andExpect(jsonPath("$.metaTitle").value("About | PropertyPro"))
			.andExpect(jsonPath("$.metaDescription").value("Our story."))
			.andExpect(jsonPath("$.metaKeywords").value("about, company"))
			.andExpect(jsonPath("$.id").doesNotExist())
			.andExpect(jsonPath("$.type").doesNotExist())
			.andExpect(jsonPath("$.status").doesNotExist())
			.andExpect(jsonPath("$.createdAt").doesNotExist())
			.andExpect(jsonPath("$.updatedAt").doesNotExist());
		mvc.perform(get(BASE + "/terms"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.subHeading").value(nullValue()))
			.andExpect(jsonPath("$.metaTitle").value(nullValue()));
	}

	@ParameterizedTest
	@ValueSource(strings = { "secret-launch", "draft-system", "no-such-page", "2", "About-Us", "about_us", "-about-us" })
	void draftsUnknownAndMalformedSlugsAreIndistinguishable404s(String slug) throws Exception {
		mvc.perform(get(BASE + "/" + slug))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("page_not_found"))
			.andExpect(jsonPath("$.detail").value("Page not found."));
	}

	@Test
	void tooLongSlugIs404() throws Exception {
		mvc.perform(get(BASE + "/" + "a".repeat(256))).andExpect(status().isNotFound());
	}

	@Test
	void listsOnlyPublishedPagesByHeadingWithoutContent() throws Exception {
		list("")
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.content[*].slug", contains("about-us", "terms")))
			.andExpect(jsonPath("$.content[0].heading").value("About us"))
			.andExpect(jsonPath("$.content[0].subHeading").value("Who we are"))
			.andExpect(jsonPath("$.content[0].content").doesNotExist())
			.andExpect(jsonPath("$.content[0].id").doesNotExist())
			.andExpect(jsonPath("$.content[0].status").doesNotExist())
			.andExpect(jsonPath("$.content[0].metaTitle").doesNotExist())
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void paginatesAndCountsOnlyPublishedPages() throws Exception {
		list("?size=1&page=0")
			.andExpect(jsonPath("$.content[*].slug", contains("about-us")))
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.totalPages").value(2));
		list("?size=1&page=1").andExpect(jsonPath("$.content[*].slug", contains("terms")));
		list("?size=1&page=5").andExpect(jsonPath("$.content", hasSize(0)));
		list("?size=1000").andExpect(jsonPath("$.size").value(100));
	}

	@Test
	void clientsCannotChangeVisibilityOrOrder() throws Exception {
		list("?status=draft&includeDrafts=true&type=system&search=secret&sort=heading,desc")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].slug", contains("about-us", "terms")));
	}

	@Test
	void unpublishingAndDeletingHideThePageImmediately() throws Exception {
		jdbc.update("UPDATE pages SET status = 'draft' WHERE id = 3");
		mvc.perform(get(BASE + "/about-us")).andExpect(status().isNotFound());
		list("").andExpect(jsonPath("$.content[*].slug", contains("terms")));

		jdbc.update("DELETE FROM pages WHERE id = 1");
		mvc.perform(get(BASE + "/terms")).andExpect(status().isNotFound());
		list("").andExpect(jsonPath("$.content", hasSize(0)));
	}

	@Test
	void publishingShowsThePageImmediately() throws Exception {
		jdbc.update("UPDATE pages SET status = 'publish' WHERE id = 2");
		mvc.perform(get(BASE + "/secret-launch")).andExpect(status().isOk());
	}

	@Test
	void writesArePublicOnlyForGet() throws Exception {
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
		mvc.perform(patch(BASE + "/about-us").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(BASE + "/about-us")).andExpect(status().isUnauthorized());
	}

	private ResultActions list(String query) throws Exception {
		return mvc.perform(get(BASE + query));
	}

	private void insert(String heading, String slug, String type, String status) {
		jdbc.update("""
				INSERT INTO pages (heading, slug, content, type, status)
				VALUES (?, ?, '<p>Body of ' || ? || '</p>', ?, ?)""", heading, slug, heading, type, status);
	}

}
