package com.propertypro.property_platform.cms.page;

import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin page management through real admin logins, so every request goes through token validation and
 * the users.user_type = roles.slug permission lookup. Roles changed by a test are restored.
 */
class AdminPageApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/pages";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final List<String> ACTIONS = List.of("view", "create", "update", "publish", "delete");
	private static final String VALID = """
			{"heading":"About us","content":"<p>We help you <b>find a home</b>.</p>"}""";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE pages RESTART IDENTITY");
		originalRoles = jdbc.queryForList(
				"SELECT slug, name, permissions::text AS permissions, status FROM roles WHERE slug = ANY (?)",
				(Object) SEEDED_ROLES.toArray(String[]::new));
		account(ADMIN_EMAIL, "admin");
		admin = adminToken(ADMIN_EMAIL);
	}

	@AfterEach
	void restoreRoles() {
		jdbc.update("DELETE FROM roles WHERE slug <> ALL (?)", (Object) SEEDED_ROLES.toArray(String[]::new));
		originalRoles.forEach(role -> jdbc.update(
				"UPDATE roles SET name = ?, permissions = ?::jsonb, status = ?, deleted_at = NULL WHERE slug = ?",
				role.get("name"), role.get("permissions"), role.get("status"), role.get("slug")));
	}

	@Nested
	class Create {

		@Test
		void createsStaticDraftWithGeneratedSlugAndServerSetFields() throws Exception {
			postPage("""
					{"heading":"  About Us & Our Team  ","content":"<p>Hello</p>","subHeading":"  ",\
					"metaTitle":"  About  "}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.heading").value("About Us & Our Team"))
				.andExpect(jsonPath("$.subHeading").value(nullValue()))
				.andExpect(jsonPath("$.slug").value("about-us-and-our-team"))
				.andExpect(jsonPath("$.content").value("<p>Hello</p>"))
				.andExpect(jsonPath("$.type").value("static"))
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.metaTitle").value("About"))
				.andExpect(jsonPath("$.metaDescription").value(nullValue()))
				.andExpect(jsonPath("$.metaKeywords").value(nullValue()))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty());
			assertThat(column(1, "status")).isEqualTo("draft");
		}

		@Test
		void createsPublishedSystemPageWithAllFields() throws Exception {
			postPage("""
					{"heading":"Terms","subHeading":"Read carefully","slug":"terms-and-conditions",\
					"content":"<h2>Terms</h2><p>Text</p>","type":"system","status":"publish",\
					"metaTitle":"Terms of use","metaDescription":"Our terms.","metaKeywords":"terms, legal"}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("terms-and-conditions"))
				.andExpect(jsonPath("$.subHeading").value("Read carefully"))
				.andExpect(jsonPath("$.type").value("system"))
				.andExpect(jsonPath("$.status").value("publish"))
				.andExpect(jsonPath("$.metaDescription").value("Our terms."))
				.andExpect(jsonPath("$.metaKeywords").value("terms, legal"));
		}

		@Test
		void generatedSlugsAreMadeUnique() throws Exception {
			createPage();
			createPage();
			postPage("{\"heading\":\"हमारे बारे में\",\"content\":\"<p>Hi</p>\"}", admin)
				.andExpect(jsonPath("$.slug").value("page"));
			assertThat(jdbc.queryForList("SELECT slug FROM pages ORDER BY id", String.class))
				.containsExactly("about-us", "about-us-2", "page");
		}

		@Test
		void rejectsDuplicateSlug() throws Exception {
			createPage();
			postPage(VALID.replace("}", ",\"slug\":\"about-us\"}"), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("page_slug_taken"))
				.andExpect(jsonPath("$.field").value("slug"));
			assertThat(pageCount()).isEqualTo(1);
		}

		@Test
		void sanitizesTheContent() throws Exception {
			postPage("""
					{"heading":"X","content":"<p onclick=\\"steal()\\">Safe<script>alert(1)</script></p>\
					<a href=\\"javascript:alert(1)\\">x</a><a href=\\"https://example.com\\">ok</a>\
					<img src=\\"https://cdn.example/a.png\\" onerror=\\"x()\\"><iframe src=\\"https://evil.example\\"></iframe>\
					<style>p{}</style>"}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.content").value("<p>Safe</p><a rel=\"nofollow noopener noreferrer\">x</a>"
						+ "<a href=\"https://example.com\" rel=\"nofollow noopener noreferrer\">ok</a>"
						+ "<img src=\"https://cdn.example/a.png\">"));
			assertThat(column(1, "content")).doesNotContain("script", "onclick", "onerror", "javascript", "iframe",
					"style");
		}

		@Test
		void storesPlainTextFieldsVerbatimForClientsToEscape() throws Exception {
			postPage("{\"heading\":\"<script>alert(1)</script>\",\"content\":\"<p>x</p>\"}", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.heading").value("<script>alert(1)</script>"))
				.andExpect(jsonPath("$.slug").value("script-alert-1-script"));
		}

		@Test
		void rejectsContentWithNothingSafeLeft() throws Exception {
			postPage("{\"heading\":\"X\",\"content\":\"<script>alert(1)</script>\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.content").value("must contain text or an image"));
			assertThat(pageCount()).isZero();
		}

		@Test
		void requiresHeadingAndContent() throws Exception {
			postPage("{}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.heading").exists())
				.andExpect(jsonPath("$.errors.content").exists());
			postPage("{\"heading\":\"   \",\"content\":\" \"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.heading").exists())
				.andExpect(jsonPath("$.errors.content").exists());
			assertThat(pageCount()).isZero();
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"\"slug\":\"About Us\"|slug",
				"\"slug\":\"about--us\"|slug",
				"\"slug\":\"-about\"|slug",
				"\"slug\":\"about_us\"|slug",
				"\"slug\":\"about/../admin\"|slug",
				"\"slug\":\"\"|slug",
				"\"type\":\"dynamic\"|type",
				"\"type\":\"STATIC\"|type",
				"\"status\":\"published\"|status",
				"\"status\":\"PUBLISH\"|status",
				"\"status\":5|status" })
		void rejectsInvalidValues(String field, String errorField) throws Exception {
			postPage(VALID.replace("}", "," + field + "}"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + errorField).exists());
			assertThat(pageCount()).isZero();
		}

		@ParameterizedTest
		@CsvSource({ "heading, 255", "subHeading, 255", "slug, 255", "content, 100000", "metaTitle, 255",
				"metaDescription, 1000", "metaKeywords, 1000" })
		void rejectsTooLongValues(String field, int maxLength) throws Exception {
			StringBuilder json = new StringBuilder("{\"" + field + "\":\"" + "a".repeat(maxLength + 1) + "\"");
			for (String required : List.of("heading", "content")) {
				if (!required.equals(field)) {
					json.append(",\"").append(required).append("\":\"X\"");
				}
			}
			postPage(json.append('}').toString(), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(pageCount()).isZero();
		}

		/** About 200 KB of JSON: above the default 64 KB body limit, within the large-body limit for pages. */
		@Test
		void acceptsContentOfMaximumLength() throws Exception {
			String content = "<p>" + "é".repeat(100_000 - 7) + "</p>";
			postPage("{\"heading\":\"Long\",\"content\":\"" + content + "\"}", admin).andExpect(status().isCreated());
			patchJson(1, "{\"content\":\"" + content + "\"}", admin).andExpect(status().isOk());
			assertThat(column(1, "length(content)")).isEqualTo("100000");
		}

		@ParameterizedTest
		@ValueSource(strings = { "id", "createdAt", "updatedAt", "deletedAt", "userType", "permissions" })
		void rejectsProtectedAndUnknownFields(String field) throws Exception {
			postPage(VALID.replace("}", ",\"" + field + "\":\"x\"}"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).value("is not allowed"));
			assertThat(pageCount()).isZero();
		}

		@Test
		void requiresJson() throws Exception {
			perform(post(BASE).contentType(MediaType.APPLICATION_FORM_URLENCODED).param("heading", "H")
					.param("content", "C"), admin)
				.andExpect(status().isUnsupportedMediaType());
			perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("not json"), admin)
				.andExpect(status().isBadRequest());
			assertThat(pageCount()).isZero();
		}

	}

	@Nested
	class Get {

		@Test
		void returnsDraftWithAllAdminFields() throws Exception {
			createPage();
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.type").value("static"))
				.andExpect(jsonPath("$.content").value("<p>We help you <b>find a home</b>.</p>"))
				.andExpect(jsonPath("$.metaTitle").value(nullValue()))
				.andExpect(jsonPath("$.createdAt").isNotEmpty());
		}

		@Test
		void returns404ForUnknownPageAnd400ForInvalidIds() throws Exception {
			perform(get(BASE + "/99"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("page_not_found"));
			perform(get(BASE + "/abc"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/99999999999999999999"), admin).andExpect(status().isBadRequest());
		}

	}

	@Nested
	class Update {

		@Test
		void changesOnlyGivenFields() throws Exception {
			postPage(VALID.replace("}", ",\"subHeading\":\"Who we are\",\"metaTitle\":\"About\"}"), admin);
			patchJson(1, "{\"heading\":\"  About the company  \",\"metaKeywords\":\"company\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.heading").value("About the company"))
				.andExpect(jsonPath("$.metaKeywords").value("company"))
				.andExpect(jsonPath("$.slug").value("about-us"))
				.andExpect(jsonPath("$.subHeading").value("Who we are"))
				.andExpect(jsonPath("$.metaTitle").value("About"))
				.andExpect(jsonPath("$.content").value("<p>We help you <b>find a home</b>.</p>"))
				.andExpect(jsonPath("$.type").value("static"))
				.andExpect(jsonPath("$.status").value("draft"));
		}

		@Test
		void changesSlugContentTypeAndStatus() throws Exception {
			createPage();
			patchJson(1, """
					{"slug":"company","content":"<p>New<script>x</script></p>","type":"system","status":"publish"}""",
					admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("company"))
				.andExpect(jsonPath("$.content").value("<p>New</p>"))
				.andExpect(jsonPath("$.type").value("system"))
				.andExpect(jsonPath("$.status").value("publish"));
			patchJson(1, "{\"status\":\"draft\"}", admin).andExpect(jsonPath("$.status").value("draft"));
		}

		@Test
		void keepingTheOwnSlugIsNotAConflictButAnotherPagesSlugIs() throws Exception {
			createPage();
			postPage("{\"heading\":\"Privacy\",\"content\":\"<p>P</p>\"}", admin);
			patchJson(1, "{\"slug\":\"about-us\",\"heading\":\"Renamed\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("about-us"));
			patchJson(2, "{\"slug\":\"about-us\"}", admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("page_slug_taken"));
			assertThat(column(2, "slug")).isEqualTo("privacy");
		}

		@Test
		void explicitNullClearsOptionalFields() throws Exception {
			postPage(VALID.replace("}", ",\"subHeading\":\"S\",\"metaTitle\":\"T\",\"metaDescription\":\"D\","
					+ "\"metaKeywords\":\"K\"}"), admin);
			patchJson(1, "{\"subHeading\":null,\"metaTitle\":null,\"metaDescription\":\"  \",\"metaKeywords\":null}",
					admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.subHeading").value(nullValue()))
				.andExpect(jsonPath("$.metaTitle").value(nullValue()))
				.andExpect(jsonPath("$.metaDescription").value(nullValue()))
				.andExpect(jsonPath("$.metaKeywords").value(nullValue()));
		}

		@ParameterizedTest
		@ValueSource(strings = { "heading", "slug", "content", "type", "status" })
		void explicitNullIsRejectedForRequiredFields(String field) throws Exception {
			createPage();
			patchJson(1, "{\"" + field + "\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"{\"slug\":\"Not Valid\"}|slug",
				"{\"type\":\"other\"}|type",
				"{\"status\":\"archived\"}|status",
				"{\"heading\":\"  \"}|heading",
				"{\"content\":\"<script></script>\"}|content" })
		void rejectsInvalidValues(String json, String errorField) throws Exception {
			createPage();
			patchJson(1, json, admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + errorField).exists());
			assertThat(column(1, "heading")).isEqualTo("About us");
			assertThat(column(1, "status")).isEqualTo("draft");
		}

		@ParameterizedTest
		@ValueSource(strings = { "id", "createdAt", "updatedAt" })
		void rejectsProtectedAndUnknownFields(String field) throws Exception {
			createPage();
			patchJson(1, "{\"" + field + "\":\"2020-01-01T00:00:00Z\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).value("is not allowed"));
		}

		@Test
		void returns404ForUnknownPageAndPutIsNotOffered() throws Exception {
			patchJson(99, "{\"heading\":\"H\"}", admin).andExpect(status().isNotFound());
			createPage();
			perform(put(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content(VALID), admin)
				.andExpect(status().isMethodNotAllowed());
		}

	}

	@Nested
	class Delete {

		@Test
		void deletesPermanentlyAndSecondDeleteIs404() throws Exception {
			createPage();
			createPage();
			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());
			assertThat(jdbc.queryForObject("SELECT count(*) FROM pages WHERE id = 1", Integer.class)).isZero();
			assertThat(pageCount()).isEqualTo(1);

			perform(delete(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("page_not_found"));
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
			patchJson(1, "{\"heading\":\"H\"}", admin).andExpect(status().isNotFound());
			perform(get(BASE), admin).andExpect(jsonPath("$.content[*].id", contains(2)));
		}

		@Test
		void systemPagesFollowTheSamePermissions() throws Exception {
			insert("Terms", "terms", "system", "publish");
			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());
			assertThat(pageCount()).isZero();
		}

	}

	@Nested
	class ListPages {

		@BeforeEach
		void insertPages() {
			insert("Privacy policy", "privacy-policy", "static", "publish");    // 1
			insert("About us", "about-us", "static", "draft");                  // 2
			insert("Terms 100%", "terms", "system", "publish");                 // 3
			insert("Contact", "contact", "system", "draft");                    // 4
		}

		@Test
		void listsDraftsAndPublishedNewestFirstWithoutContent() throws Exception {
			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].id", contains(4, 3, 2, 1)))
				.andExpect(jsonPath("$.content[*].status", contains("draft", "publish", "draft", "publish")))
				.andExpect(jsonPath("$.content[0].type").value("system"))
				.andExpect(jsonPath("$.content[0].slug").value("contact"))
				.andExpect(jsonPath("$.content[0].content").doesNotExist())
				.andExpect(jsonPath("$.content[0].metaTitle").doesNotExist())
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(4))
				.andExpect(jsonPath("$.totalPages").value(1));
			list("?size=2&page=1").andExpect(jsonPath("$.content[*].id", contains(2, 1)));
			list("?size=1000").andExpect(jsonPath("$.size").value(100));
		}

		@Test
		void filters() throws Exception {
			list("?search=PRIVACY").andExpect(jsonPath("$.content[*].id", contains(1)));
			perform(get(BASE).param("search", "sub of about"), admin).andExpect(jsonPath("$.content[*].id", contains(2)));
			list("?search=privacy-pol").andExpect(jsonPath("$.content[*].id", contains(1)));
			perform(get(BASE).param("search", "100%"), admin).andExpect(jsonPath("$.content[*].id", contains(3)));
			perform(get(BASE).param("search", "_"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			list("?status=draft").andExpect(jsonPath("$.content[*].id", contains(4, 2)));
			list("?status=publish").andExpect(jsonPath("$.content[*].id", contains(3, 1)));
			list("?type=system").andExpect(jsonPath("$.content[*].id", contains(4, 3)));
			list("?type=static&status=publish").andExpect(jsonPath("$.content[*].id", contains(1)));
		}

		@Test
		void sortsByAllowedFields() throws Exception {
			list("?sort=heading,asc").andExpect(jsonPath("$.content[*].id", contains(2, 4, 1, 3)));
			list("?sort=slug,desc").andExpect(jsonPath("$.content[*].id", contains(3, 1, 4, 2)));
			list("?sort=createdAt,asc").andExpect(jsonPath("$.content[*].id", contains(1, 2, 3, 4)));
			list("?sort=updatedAt,desc").andExpect(jsonPath("$.content[*].id", contains(4, 3, 2, 1)));
			list("?sort=type,asc&sort=id,asc").andExpect(jsonPath("$.content[*].id", contains(1, 2, 3, 4)));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"sort=content|sort",
				"sort=created_at|sort",
				"sort=heading;DROP TABLE pages|sort",
				"sort=heading,sideways|sort",
				"status=published|status",
				"type=dynamic|type" })
		void rejectsInvalidParameters(String query, String errorField) throws Exception {
			list("?" + query)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
			assertThat(pageCount()).isEqualTo(4);
		}

		@Test
		void rejectsTooLongSearch() throws Exception {
			perform(get(BASE).param("search", "a".repeat(101)), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.search").exists());
		}

		private ResultActions list(String query) throws Exception {
			return perform(get(BASE + query.replace(" ", "%20")), admin);
		}

	}

	@Nested
	class Access {

		@Test
		void requiresAuthentication() throws Exception {
			createPage();
			for (String endpoint : ENDPOINTS) {
				// With a valid CSRF token: without one, the CSRF check answers 403 before authentication.
				mvc.perform(withCsrf(endpoint(endpoint))).andExpect(status().isUnauthorized());
				mvc.perform(endpoint(endpoint).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
					.andExpect(status().isUnauthorized());
			}
			assertUnchanged();
		}

		@Test
		void rejectsAppUsersWhateverTheyClaim() throws Exception {
			createPage();
			registerActiveUser();
			String appUser = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), appUser).andExpect(status().isForbidden());
				perform(endpoint(endpoint).param("userId", "1").param("role", "admin").param("userType", "admin")
						.param("permissions", "PAGE_DELETE").header("X-User-Id", "1").header("X-Role", "admin")
						.header("X-Permissions", "PAGE_DELETE"), appUser)
					.andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void seededAdminRoleIsTheOnlyRoleWithPagePermissions() throws Exception {
			assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'page'", String.class))
				.containsExactly("admin");
			assertThat(jdbc.queryForObject("SELECT (permissions -> 'page')::text FROM roles WHERE slug = 'admin'",
					String.class))
				.isEqualTo("{\"view\": true, \"create\": true, \"delete\": true, \"update\": true, \"publish\": true}");

			createPage();
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), admin).andExpect(status().is2xxSuccessful());
			}
		}

		/** Every other page permission is not enough; the endpoint's own permission is. */
		@ParameterizedTest(name = "{0} needs page.{1}")
		@MethodSource("com.propertypro.property_platform.cms.page.AdminPageApiTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String action, int successStatus) throws Exception {
			createPage();
			String[] others = ACTIONS.stream().filter(a -> !a.equals(action)).toArray(String[]::new);

			perform(endpoint(endpoint), staff("without", others)).andExpect(status().isForbidden());
			assertUnchanged();

			perform(endpoint(endpoint), staff("only", action)).andExpect(status().is(successStatus));
		}

		@Test
		void systemPagesNeedTheSamePermissions() throws Exception {
			insert("Terms", "terms", "system", "draft");
			String viewer = staff("viewer", "view");
			perform(get(BASE + "/1"), viewer).andExpect(status().isOk());
			patchJson(1, "{\"heading\":\"X\"}", viewer).andExpect(status().isForbidden());
			perform(delete(BASE + "/1"), viewer).andExpect(status().isForbidden());
			assertThat(column(1, "heading")).isEqualTo("Terms");
		}

		@Test
		void publishingNeedsThePublishPermissionToo() throws Exception {
			createPage();
			String editor = staff("editor", "view", "create", "update", "delete");

			postPage(VALID.replace("}", ",\"status\":\"publish\"}"), editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("page_publish_forbidden"));
			patchJson(1, "{\"status\":\"publish\"}", editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("page_publish_forbidden"));
			// Rejected as a whole: other fields in the same request are not saved either.
			patchJson(1, "{\"heading\":\"Sneaky\",\"status\":\"publish\"}", editor).andExpect(status().isForbidden());
			assertThat(pageCount()).isEqualTo(1);
			assertThat(column(1, "status")).isEqualTo("draft");
			assertThat(column(1, "heading")).isEqualTo("About us");

			// Drafts and content edits are fine; resending the current status is not a change.
			postPage(VALID.replace("}", ",\"status\":\"draft\"}"), editor).andExpect(status().isCreated());
			patchJson(1, "{\"heading\":\"Edited\",\"status\":\"draft\"}", editor).andExpect(status().isOk());

			// A published page cannot be unpublished without it either.
			jdbc.update("UPDATE pages SET status = 'publish' WHERE id = 1");
			patchJson(1, "{\"status\":\"draft\"}", editor).andExpect(status().isForbidden());
			assertThat(column(1, "status")).isEqualTo("publish");

			String publisher = staff("publisher", "create", "update", "publish");
			patchJson(1, "{\"status\":\"draft\"}", publisher).andExpect(status().isOk());
			postPage(VALID.replace("}", ",\"status\":\"publish\"}"), publisher).andExpect(status().isCreated());
		}

		@Test
		void publishAloneAllowsNoEndpoint() throws Exception {
			createPage();
			String publisher = staff("publisher", "publish");
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), publisher).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void otherModulePermissionsAreNotEnough() throws Exception {
			createPage();
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('FAQs', 'faqs', ?::jsonb)",
					"{\"admin_panel\": {\"access\": true}, \"faq\": {\"view\": true, \"create\": true, "
							+ "\"update\": true, \"publish\": true, \"delete\": true}, \"page\": {\"view\": false}}");
			account("faqs@example.com", "faqs");
			String faqStaff = adminToken("faqs@example.com");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), faqStaff).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void roleChangesApplyOnTheNextRequest() throws Exception {
			createPage();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET permissions = permissions #- '{page,view}' WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(get(BASE), staff).andExpect(status().isForbidden());
			patchJson(1, "{\"heading\":\"Still allowed\"}", staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			patchJson(1, "{\"heading\":\"X\"}", staff).andExpect(status().isForbidden());
			jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'editor'");
			patchJson(1, "{\"heading\":\"X\"}", staff).andExpect(status().isForbidden());
			assertThat(column(1, "heading")).isEqualTo("Still allowed");
		}

		@Test
		void userTypeWithoutMatchingRoleIsDenied() throws Exception {
			createPage();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE users SET user_type = 'no-such-role' WHERE email = 'editor@example.com'");
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), staff).andExpect(status().isForbidden());
			}

			jdbc.update("UPDATE users SET user_type = 'user' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			assertUnchanged();
		}

		@Test
		void adminPanelAccessIsRequired() throws Exception {
			createPage();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");

			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(delete(BASE + "/1"), staff).andExpect(status().isForbidden());
			assertUnchanged();
		}

		@Test
		void writesAreRateLimitedPerAdmin() throws Exception {
			createPage();
			for (int i = 0; i < 119; i++) {
				patchJson(1, "{\"metaTitle\":\"T" + i + "\"}", admin).andExpect(status().isOk());
			}
			patchJson(1, "{\"metaTitle\":\"T\"}", admin)
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists(HttpHeaders.RETRY_AFTER));
			perform(get(BASE + "/1"), admin).andExpect(status().isOk());
		}

		private void assertUnchanged() {
			assertThat(pageCount()).isEqualTo(1);
			assertThat(column(1, "heading")).isEqualTo("About us");
			assertThat(column(1, "status")).isEqualTo("draft");
		}

	}

	// ---- Endpoints ----

	/** Delete last, so looping over them leaves page 1 in place for the others. */
	private static final List<String> ENDPOINTS = List.of("list", "view", "create", "update", "delete");

	static Stream<Arguments> endpointPermissions() {
		return Stream.of(
				Arguments.of("list", "view", 200),
				Arguments.of("view", "view", 200),
				Arguments.of("create", "create", 201),
				Arguments.of("update", "update", 200),
				Arguments.of("delete", "delete", 204));
	}

	/** A new request for one endpoint, on page 1. Create and update never change status here. */
	private MockHttpServletRequestBuilder endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> post(BASE).contentType(MediaType.APPLICATION_JSON).content(VALID);
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"heading\":\"Changed\"}");
			case "delete" -> delete(BASE + "/1");
			default -> throw new IllegalArgumentException(name);
		};
	}

	// ---- Helpers ----

	private void createPage() throws Exception {
		postPage(VALID, admin).andExpect(status().isCreated());
	}

	private ResultActions postPage(String json, String token) throws Exception {
		return perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	/** Logs in a staff member whose new role grants admin panel access plus the given page actions. */
	private String staff(String slug, String... actions) throws Exception {
		String granted = Arrays.stream(actions).map(a -> "\"" + a + "\": true")
			.reduce((a, b) -> a + ", " + b).orElse("");
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"page\": {" + granted + "}}");
		String email = slug + "@example.com";
		account(email, slug);
		return adminToken(email);
	}

	private void account(String email, String userType) {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES (?, ?, 'Staff Member', 'active', ?, now())""", email, passwordEncoder.encode(PASSWORD), userType);
	}

	private String adminToken(String email) throws Exception {
		return accessToken(postJson("/api/v1/admin/login", "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD)));
	}

	/** Created and updated one second apart in insertion order, so timestamp sorts follow the id. */
	private void insert(String heading, String slug, String type, String status) {
		jdbc.update("""
				INSERT INTO pages (heading, sub_heading, slug, content, type, status, created_at, updated_at)
				VALUES (?, 'Sub of ' || ?, ?, '<p>Body</p>', ?, ?,
				    now() + (SELECT count(*) FROM pages) * interval '1 second',
				    now() + (SELECT count(*) FROM pages) * interval '1 second')""",
				heading, heading, slug, type, status);
	}

	private int pageCount() {
		return jdbc.queryForObject("SELECT count(*) FROM pages", Integer.class);
	}

	/** One column of a page, as text; null when SQL NULL. */
	private String column(long id, String name) {
		return jdbc.queryForObject("SELECT " + name + "::text FROM pages WHERE id = ?", String.class, id);
	}

}
