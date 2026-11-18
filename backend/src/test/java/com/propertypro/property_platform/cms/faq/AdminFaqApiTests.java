package com.propertypro.property_platform.cms.faq;

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
 * Admin FAQ management through real admin logins, so every request goes through token validation and
 * the users.user_type = roles.slug permission lookup. Roles changed by a test are restored. Categories
 * come from application.yml (general, billing, technical).
 */
class AdminFaqApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/faqs";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final List<String> ACTIONS = List.of("view", "create", "update", "publish", "delete");
	private static final String VALID = """
			{"question":"How do I list a property?","answer":"<p>Tap <b>Post property</b>.</p>","category":"general"}""";

	@Autowired
	private PasswordEncoder passwordEncoder;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE faqs RESTART IDENTITY");
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
		void createsDraftWithDefaultsAndServerSetFields() throws Exception {
			postFaq("""
					{"question":"  How do I list a property?  ","answer":"<p>Tap <b>Post property</b>.</p>",\
					"category":" general "}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.question").value("How do I list a property?"))
				.andExpect(jsonPath("$.answer").value("<p>Tap <b>Post property</b>.</p>"))
				.andExpect(jsonPath("$.category").value("general"))
				.andExpect(jsonPath("$.categoryLabel").value("General"))
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.sortOrder").value(0))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty());
			assertThat(column(1, "status")).isEqualTo("draft");
		}

		@Test
		void createsPublishedWithSortOrder() throws Exception {
			postFaq("""
					{"question":"Q?","answer":"A.","category":"billing","status":"publish","sortOrder":5}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("publish"))
				.andExpect(jsonPath("$.sortOrder").value(5))
				.andExpect(jsonPath("$.categoryLabel").value("Billing & Payments"));
		}

		@Test
		void sanitizesTheAnswer() throws Exception {
			postFaq("""
					{"question":"Q?","category":"general","answer":"<p onclick=\\"steal()\\">Safe<script>alert(1)</script>\
					</p><a href=\\"javascript:alert(1)\\">x</a><a href=\\"https://example.com\\">ok</a>\
					<img src=\\"https://evil.example/x.png\\"><iframe src=\\"https://evil.example\\"></iframe>"}""", admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.answer").value("<p>Safe</p><a rel=\"nofollow noopener noreferrer\">x</a>"
						+ "<a href=\"https://example.com\" rel=\"nofollow noopener noreferrer\">ok</a>"));
			assertThat(column(1, "answer")).doesNotContain("script", "onclick", "javascript", "iframe", "img");
		}

		@Test
		void rejectsAnswerWithNothingSafeLeft() throws Exception {
			postFaq("{\"question\":\"Q?\",\"answer\":\"<script>alert(1)</script>\",\"category\":\"general\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.answer").value("must contain text"));
			assertThat(faqCount()).isZero();
		}

		@Test
		void requiresQuestionAnswerAndCategory() throws Exception {
			postFaq("{}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.question").exists())
				.andExpect(jsonPath("$.errors.answer").exists())
				.andExpect(jsonPath("$.errors.category").exists());
			postFaq("{\"question\":\"   \",\"answer\":\" \",\"category\":\"\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.question").exists())
				.andExpect(jsonPath("$.errors.answer").exists())
				.andExpect(jsonPath("$.errors.category").exists());
			assertThat(faqCount()).isZero();
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"\"category\":\"unknown\"|category",
				"\"category\":\"General\"|category",
				"\"category\":\"general' OR '1'='1\"|category",
				"\"status\":\"published\"|status",
				"\"status\":\"PUBLISH\"|status",
				"\"status\":5|status",
				"\"sortOrder\":-1|sortOrder",
				"\"sortOrder\":100001|sortOrder",
				"\"sortOrder\":\"abc\"|sortOrder" })
		void rejectsInvalidValues(String field, String errorField) throws Exception {
			postFaq(VALID.replace("\"category\":\"general\"", "\"category\":\"general\"," + field)
					.replace("\"category\":\"general\",\"category\"", "\"category\""), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + errorField).exists());
			assertThat(faqCount()).isZero();
		}

		@Test
		void rejectsSortOrderOutsideTheIntegerRange() throws Exception {
			postFaq(VALID.replace("}", ",\"sortOrder\":99999999999}"), admin).andExpect(status().isBadRequest());
			assertThat(faqCount()).isZero();
		}

		@ParameterizedTest
		@CsvSource({ "question, 500", "answer, 10000", "category, 50" })
		void rejectsTooLongValues(String field, int maxLength) throws Exception {
			String json = "{\"question\":\"Q?\",\"answer\":\"A.\",\"category\":\"general\",\"%s\":\"%s\"}"
				.formatted(field, "a".repeat(maxLength + 1));
			postFaq(json.replaceFirst("\"" + field + "\":\"[^\"]*\",?", ""), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@ParameterizedTest
		@ValueSource(strings = { "id", "createdAt", "updatedAt", "categoryLabel", "deletedAt" })
		void rejectsProtectedAndUnknownFields(String field) throws Exception {
			postFaq(VALID.replace("}", ",\"" + field + "\":\"x\"}"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).value("is not allowed"));
			assertThat(faqCount()).isZero();
		}

		@Test
		void requiresJson() throws Exception {
			perform(post(BASE).contentType(MediaType.APPLICATION_FORM_URLENCODED).param("question", "Q?")
					.param("answer", "A.").param("category", "general"), admin)
				.andExpect(status().isUnsupportedMediaType());
			perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("not json"), admin)
				.andExpect(status().isBadRequest());
			assertThat(faqCount()).isZero();
		}

	}

	@Nested
	class Get {

		@Test
		void returnsDraftWithFullAnswer() throws Exception {
			createFaq();
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.answer").value("<p>Tap <b>Post property</b>.</p>"));
		}

		@Test
		void returns404ForUnknownFaqAnd400ForInvalidIds() throws Exception {
			perform(get(BASE + "/99"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("faq_not_found"));
			perform(get(BASE + "/abc"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/99999999999999999999"), admin).andExpect(status().isBadRequest());
		}

		@Test
		void removedCategoryHasNoLabelButStillLoads() throws Exception {
			insert("Old?", "removed_category", "publish", 0);
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.category").value("removed_category"))
				.andExpect(jsonPath("$.categoryLabel").value(nullValue()));
		}

	}

	@Nested
	class Update {

		@Test
		void changesOnlyGivenFields() throws Exception {
			createFaq();
			patchJson(1, "{\"question\":\"  New question?  \",\"sortOrder\":3}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.question").value("New question?"))
				.andExpect(jsonPath("$.sortOrder").value(3))
				.andExpect(jsonPath("$.answer").value("<p>Tap <b>Post property</b>.</p>"))
				.andExpect(jsonPath("$.category").value("general"))
				.andExpect(jsonPath("$.status").value("draft"));
		}

		@Test
		void changesCategoryAnswerAndStatus() throws Exception {
			createFaq();
			patchJson(1, "{\"category\":\"technical\",\"answer\":\"<p>New<script>x</script></p>\",\"status\":\"publish\"}",
					admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.category").value("technical"))
				.andExpect(jsonPath("$.categoryLabel").value("Technical Support"))
				.andExpect(jsonPath("$.answer").value("<p>New</p>"))
				.andExpect(jsonPath("$.status").value("publish"));
			patchJson(1, "{\"status\":\"draft\"}", admin).andExpect(jsonPath("$.status").value("draft"));
		}

		@Test
		void movesFaqOutOfARemovedCategoryButNotIntoOne() throws Exception {
			insert("Old?", "removed_category", "publish", 0);
			patchJson(1, "{\"question\":\"Still editable?\"}", admin).andExpect(status().isOk());
			patchJson(1, "{\"category\":\"removed_category\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.category").exists());
			patchJson(1, "{\"category\":\"billing\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.categoryLabel").value("Billing & Payments"));
		}

		@ParameterizedTest
		@ValueSource(strings = { "question", "answer", "category", "status", "sortOrder" })
		void explicitNullIsRejected(String field) throws Exception {
			createFaq();
			patchJson(1, "{\"" + field + "\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"{\"category\":\"unknown\"}|category",
				"{\"status\":\"archived\"}|status",
				"{\"sortOrder\":-5}|sortOrder",
				"{\"sortOrder\":\"first\"}|sortOrder",
				"{\"question\":\"  \"}|question",
				"{\"answer\":\"<script></script>\"}|answer" })
		void rejectsInvalidValues(String json, String errorField) throws Exception {
			createFaq();
			patchJson(1, json, admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + errorField).exists());
			assertThat(column(1, "question")).isEqualTo("How do I list a property?");
		}

		@ParameterizedTest
		@ValueSource(strings = { "id", "createdAt", "updatedAt", "categoryLabel" })
		void rejectsProtectedAndUnknownFields(String field) throws Exception {
			createFaq();
			patchJson(1, "{\"" + field + "\":\"2020-01-01T00:00:00Z\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).value("is not allowed"));
		}

		@Test
		void returns404ForUnknownFaqAndPutIsNotOffered() throws Exception {
			patchJson(99, "{\"question\":\"Q?\"}", admin).andExpect(status().isNotFound());
			createFaq();
			perform(put(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content(VALID), admin)
				.andExpect(status().isMethodNotAllowed());
		}

	}

	@Nested
	class Delete {

		@Test
		void deletesPermanentlyAndSecondDeleteIs404() throws Exception {
			createFaq();
			createFaq();
			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());
			assertThat(jdbc.queryForObject("SELECT count(*) FROM faqs WHERE id = 1", Integer.class)).isZero();
			assertThat(faqCount()).isEqualTo(1);

			perform(delete(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("faq_not_found"));
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
			patchJson(1, "{\"question\":\"Q?\"}", admin).andExpect(status().isNotFound());
			perform(get(BASE), admin).andExpect(jsonPath("$.content[*].id", contains(2)));
		}

	}

	@Nested
	class ListFaqs {

		@BeforeEach
		void insertFaqs() {
			insert("How do refunds work? 100%", "billing", "publish", 2);
			insert("What is a draft?", "general", "draft", 1);
			insert("Is the app free?", "general", "publish", 1);
			insert("Old question", "removed_category", "publish", 0);
		}

		@Test
		void listsDraftsAndPublishedInDisplayOrderWithoutAnswer() throws Exception {
			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].id", contains(4, 2, 3, 1)))
				.andExpect(jsonPath("$.content[*].status", contains("publish", "draft", "publish", "publish")))
				.andExpect(jsonPath("$.content[0].categoryLabel").value(nullValue()))
				.andExpect(jsonPath("$.content[1].categoryLabel").value("General"))
				.andExpect(jsonPath("$.content[0].answer").doesNotExist())
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(4))
				.andExpect(jsonPath("$.totalPages").value(1));
			list("?size=2&page=1").andExpect(jsonPath("$.content[*].id", contains(3, 1)));
			list("?size=1000").andExpect(jsonPath("$.size").value(100));
		}

		@Test
		void filters() throws Exception {
			list("?search=REFUND").andExpect(jsonPath("$.content[*].id", contains(1)));
			perform(get(BASE).param("search", "answer for"), admin).andExpect(jsonPath("$.content", hasSize(4)));
			perform(get(BASE).param("search", "100%"), admin).andExpect(jsonPath("$.content[*].id", contains(1)));
			perform(get(BASE).param("search", "_"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			list("?status=draft").andExpect(jsonPath("$.content[*].id", contains(2)));
			list("?status=publish").andExpect(jsonPath("$.content[*].id", contains(4, 3, 1)));
			list("?category=general").andExpect(jsonPath("$.content[*].id", contains(2, 3)));
			list("?category=general&status=publish").andExpect(jsonPath("$.content[*].id", contains(3)));
			list("?category=removed_category").andExpect(jsonPath("$.content[*].id", contains(4)));
		}

		@Test
		void sortsByAllowedFields() throws Exception {
			list("?sort=question,asc").andExpect(jsonPath("$.content[*].id", contains(1, 3, 4, 2)));
			list("?sort=sortOrder,desc").andExpect(jsonPath("$.content[*].id", contains(1, 2, 3, 4)));
			list("?sort=createdAt,desc").andExpect(jsonPath("$.content[*].id", contains(4, 3, 2, 1)));
			list("?sort=id,desc").andExpect(jsonPath("$.content[*].id", contains(4, 3, 2, 1)));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"sort=answer|sort",
				"sort=sort_order|sort",
				"sort=question;DROP TABLE faqs|sort",
				"sort=question,sideways|sort",
				"status=published|status",
				"category=Bad Key|category",
				"category=general'--|category" })
		void rejectsInvalidParameters(String query, String errorField) throws Exception {
			list("?" + query)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
			assertThat(faqCount()).isEqualTo(4);
		}

		private ResultActions list(String query) throws Exception {
			return perform(get(BASE + query.replace(" ", "%20").replace("'", "%27")), admin);
		}

	}

	@Nested
	class Access {

		@Test
		void requiresAuthentication() throws Exception {
			createFaq();
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
			createFaq();
			registerActiveUser();
			String appUser = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), appUser).andExpect(status().isForbidden());
				perform(endpoint(endpoint).param("userId", "1").param("role", "admin").param("userType", "admin")
						.param("permissions", "FAQ_DELETE").header("X-User-Id", "1").header("X-Role", "admin")
						.header("X-Permissions", "FAQ_DELETE"), appUser)
					.andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void seededAdminRoleIsTheOnlyRoleWithFaqPermissions() throws Exception {
			assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'faq'", String.class))
				.containsExactly("admin");
			assertThat(jdbc.queryForObject("SELECT (permissions -> 'faq')::text FROM roles WHERE slug = 'admin'",
					String.class))
				.isEqualTo("{\"view\": true, \"create\": true, \"delete\": true, \"update\": true, \"publish\": true}");

			createFaq();
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), admin).andExpect(status().is2xxSuccessful());
			}
		}

		/** Every other FAQ permission is not enough; the endpoint's own permission is. */
		@ParameterizedTest(name = "{0} needs faq.{1}")
		@MethodSource("com.propertypro.property_platform.cms.faq.AdminFaqApiTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String action, int successStatus) throws Exception {
			createFaq();
			String[] others = ACTIONS.stream().filter(a -> !a.equals(action)).toArray(String[]::new);

			perform(endpoint(endpoint), staff("without", others)).andExpect(status().isForbidden());
			assertUnchanged();

			perform(endpoint(endpoint), staff("only", action)).andExpect(status().is(successStatus));
		}

		@Test
		void publishingNeedsThePublishPermissionToo() throws Exception {
			createFaq();
			String editor = staff("editor", "view", "create", "update", "delete");

			postFaq(VALID.replace("}", ",\"status\":\"publish\"}"), editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("faq_publish_forbidden"));
			patchJson(1, "{\"status\":\"publish\"}", editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("faq_publish_forbidden"));
			assertThat(faqCount()).isEqualTo(1);
			assertThat(column(1, "status")).isEqualTo("draft");

			// Drafts and content edits are fine; resending the current status is not a change.
			postFaq(VALID.replace("}", ",\"status\":\"draft\"}"), editor).andExpect(status().isCreated());
			patchJson(1, "{\"question\":\"Edited?\",\"status\":\"draft\"}", editor).andExpect(status().isOk());

			// A published FAQ cannot be unpublished without it either.
			jdbc.update("UPDATE faqs SET status = 'publish' WHERE id = 1");
			patchJson(1, "{\"status\":\"draft\"}", editor).andExpect(status().isForbidden());
			assertThat(column(1, "status")).isEqualTo("publish");

			String publisher = staff("publisher", "create", "update", "publish");
			patchJson(1, "{\"status\":\"draft\"}", publisher).andExpect(status().isOk());
			postFaq(VALID.replace("}", ",\"status\":\"publish\"}"), publisher).andExpect(status().isCreated());
		}

		@Test
		void publishAloneAllowsNoEndpoint() throws Exception {
			createFaq();
			String publisher = staff("publisher", "publish");
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), publisher).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void otherModulePermissionsAreNotEnough() throws Exception {
			createFaq();
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Blogs', 'blogs', ?::jsonb)",
					"{\"admin_panel\": {\"access\": true}, \"blog\": {\"view\": true, \"create\": true, "
							+ "\"update\": true, \"delete\": true}, \"faq\": {\"view\": false, \"delete\": false}}");
			account("blogs@example.com", "blogs");
			String blogStaff = adminToken("blogs@example.com");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), blogStaff).andExpect(status().isForbidden());
			}
			assertUnchanged();
		}

		@Test
		void roleChangesApplyOnTheNextRequest() throws Exception {
			createFaq();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET permissions = permissions #- '{faq,view}' WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(get(BASE), staff).andExpect(status().isForbidden());
			patchJson(1, "{\"question\":\"Still allowed?\"}", staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			patchJson(1, "{\"question\":\"X?\"}", staff).andExpect(status().isForbidden());
			jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'editor'");
			patchJson(1, "{\"question\":\"X?\"}", staff).andExpect(status().isForbidden());
			assertThat(column(1, "question")).isEqualTo("Still allowed?");
		}

		@Test
		void userTypeWithoutMatchingRoleIsDenied() throws Exception {
			createFaq();
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
			createFaq();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");

			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(delete(BASE + "/1"), staff).andExpect(status().isForbidden());
			assertUnchanged();
		}

		@Test
		void writesAreRateLimitedPerAdmin() throws Exception {
			createFaq();
			for (int i = 0; i < 119; i++) {
				patchJson(1, "{\"sortOrder\":" + i + "}", admin).andExpect(status().isOk());
			}
			patchJson(1, "{\"sortOrder\":1}", admin)
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists(HttpHeaders.RETRY_AFTER));
			perform(get(BASE + "/1"), admin).andExpect(status().isOk());
		}

		private void assertUnchanged() {
			assertThat(faqCount()).isEqualTo(1);
			assertThat(column(1, "question")).isEqualTo("How do I list a property?");
			assertThat(column(1, "status")).isEqualTo("draft");
		}

	}

	// ---- Endpoints ----

	/** Delete last, so looping over them leaves FAQ 1 in place for the others. */
	private static final List<String> ENDPOINTS = List.of("list", "view", "create", "update", "delete");

	static Stream<Arguments> endpointPermissions() {
		return Stream.of(
				Arguments.of("list", "view", 200),
				Arguments.of("view", "view", 200),
				Arguments.of("create", "create", 201),
				Arguments.of("update", "update", 200),
				Arguments.of("delete", "delete", 204));
	}

	/** A new request for one endpoint, on FAQ 1. Create and update never change status here. */
	private MockHttpServletRequestBuilder endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> post(BASE).contentType(MediaType.APPLICATION_JSON).content(VALID);
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"Changed?\"}");
			case "delete" -> delete(BASE + "/1");
			default -> throw new IllegalArgumentException(name);
		};
	}

	// ---- Helpers ----

	private void createFaq() throws Exception {
		postFaq(VALID, admin).andExpect(status().isCreated());
	}

	private ResultActions postFaq(String json, String token) throws Exception {
		return perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	private ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	/** Logs in a staff member whose new role grants admin panel access plus the given FAQ actions. */
	private String staff(String slug, String... actions) throws Exception {
		String granted = Arrays.stream(actions).map(a -> "\"" + a + "\": true")
			.reduce((a, b) -> a + ", " + b).orElse("");
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"faq\": {" + granted + "}}");
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

	/** Created one second apart in insertion order, so createdAt sorts follow the id. */
	private void insert(String question, String category, String status, int sortOrder) {
		jdbc.update("""
				INSERT INTO faqs (question, answer, category, status, sort_order, created_at, updated_at)
				VALUES (?, 'The answer for ' || ?, ?, ?, ?,
				    now() + (SELECT count(*) FROM faqs) * interval '1 second', now())""",
				question, question, category, status, sortOrder);
	}

	private int faqCount() {
		return jdbc.queryForObject("SELECT count(*) FROM faqs", Integer.class);
	}

	/** One column of a FAQ, as text; null when SQL NULL. */
	private String column(long id, String name) {
		return jdbc.queryForObject("SELECT " + name + "::text FROM faqs WHERE id = ?", String.class, id);
	}

}
