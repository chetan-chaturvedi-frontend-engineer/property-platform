package com.propertypro.property_platform.cms.blog;

import com.propertypro.property_platform.media.storage.MediaStorage;
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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin blog category management through real admin logins, so every request goes through token
 * validation and the users.user_type = roles.slug permission lookup. Roles changed by a test are restored.
 */
class AdminBlogCategoryApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/blog-categories";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final List<String> ACTIONS = List.of("view", "create", "update", "delete");
	/** PNG signature plus padding: enough for content detection. */
	private static final byte[] PNG = bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R');
	private static final byte[] JPEG = bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1);
	private static final String IMAGE_URL = "^/api/v1/admin/blog-categories/%d/image/[0-9a-f-]{36}\\.%s$";

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private MediaStorage storage;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE blogs, blog_categories RESTART IDENTITY");
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
		void createsWithGeneratedSlugAndServerSetFields() throws Exception {
			perform(createRequest("title", "  Home Loans & EMI  "), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.title").value("Home Loans & EMI"))
				.andExpect(jsonPath("$.slug").value("home-loans-and-emi"))
				.andExpect(jsonPath("$.icon").value(nullValue()))
				.andExpect(jsonPath("$.imageUrl").value(nullValue()))
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.metaTitle").value(nullValue()))
				.andExpect(jsonPath("$.blogCount").value(0))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty())
				.andExpect(jsonPath("$.image").doesNotExist())
				.andExpect(jsonPath("$.deletedAt").doesNotExist());
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void storesAllFieldsAndImage() throws Exception {
			perform(createRequest("slug", "market-news", "icon", "mdi:home-city", "status", "inactive",
					"metaTitle", " Market news ", "metaDescription", "Latest property market news").file(png()), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("market-news"))
				.andExpect(jsonPath("$.icon").value("mdi:home-city"))
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.metaTitle").value("Market news"))
				.andExpect(jsonPath("$.metaDescription").value("Latest property market news"))
				.andExpect(jsonPath("$.imageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "png"))));
			String key = column(1, "image");
			assertThat(key).matches("blog-categories/[0-9a-f-]{36}\\.png");
			assertThat(storage.get(key).exists()).isTrue();
		}

		@Test
		void duplicateTitlesGetNumberedSlugsAndDeletedSlugsStayReserved() throws Exception {
			createCategory("title", "Technology");
			createCategory("title", "Technology");
			jdbc.update("UPDATE blog_categories SET deleted_at = now() WHERE id = 2");

			perform(createRequest("title", "technology!"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("technology-3"));
			// Titles without Latin letters or digits still get a valid slug.
			perform(createRequest("title", "प्रॉपर्टी"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("category"));
		}

		@Test
		void rejectsTakenSlugIncludingDeletedCategories() throws Exception {
			createCategory("slug", "guides");
			perform(createRequest("title", "Other", "slug", "guides"), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("blog_category_slug_taken"))
				.andExpect(jsonPath("$.field").value("slug"));

			jdbc.update("UPDATE blog_categories SET deleted_at = now()");
			perform(createRequest("title", "Other", "slug", "guides"), admin).andExpect(status().isConflict());
			assertThat(categoryCount()).isEqualTo(1);
		}

		@Test
		void requiresTitle() throws Exception {
			perform(multipart(BASE), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.title").exists());
			assertThat(categoryCount()).isZero();
		}

		@ParameterizedTest(name = "{0}={1}")
		@CsvSource(delimiter = '|', value = {
				"title|''",
				"title|'   '",
				"slug|Home Loans",
				"slug|home--loans",
				"slug|-home",
				"slug|home_loans",
				"slug|''",
				"icon|<svg onload=alert(1)>",
				"icon|https://evil.example/icon.svg",
				"icon|../icons/home",
				"status|published",
				"status|true" })
		void rejectsInvalidField(String field, String value) throws Exception {
			perform(createRequest(field, value), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(categoryCount()).isZero();
		}

		@ParameterizedTest(name = "{0} longer than {1}")
		@CsvSource({ "title,255", "slug,255", "icon,100", "metaTitle,255", "metaDescription,1000" })
		void rejectsTooLongValues(String field, int maxLength) throws Exception {
			perform(createRequest(field, "a".repeat(maxLength + 1)), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(categoryCount()).isZero();
		}

		@Test
		void acceptsMaximumLengths() throws Exception {
			perform(createRequest("title", "t".repeat(255), "slug", "s".repeat(255), "metaTitle", "m".repeat(255),
					"metaDescription", "d".repeat(1000), "icon", "i".repeat(100)), admin)
				.andExpect(status().isCreated());
			// A generated slug from a maximum-length title leaves room for numbering.
			perform(createRequest("title", "t".repeat(255)), admin).andExpect(status().isCreated());
			perform(createRequest("title", "t".repeat(255)), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("t".repeat(240) + "-2"));
		}

		@Test
		void rejectsFilesThatAreNotImages() throws Exception {
			MockMultipartFile svg = new MockMultipartFile("image", "icon.png", "image/png", "<svg onload=alert(1)>".getBytes());
			MockMultipartFile pdf = new MockMultipartFile("image", "icon.pdf", "image/png", "%PDF-1.7 fake".getBytes());
			MockMultipartFile renamed = new MockMultipartFile("image", "icon.jpg", "image/jpeg", PNG);
			MockMultipartFile script = new MockMultipartFile("image", "shell.php", "image/png", "<?php system($_GET[1]);".getBytes());
			MockMultipartFile empty = new MockMultipartFile("image", "empty.png", "image/png", new byte[0]);
			for (MockMultipartFile file : List.of(svg, pdf, renamed, script, empty)) {
				perform(createRequest().file(file), admin)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.errors.image").exists());
			}
			assertThat(categoryCount()).isZero();
		}

		@Test
		void rejectsOversizedImage() throws Exception {
			byte[] large = Arrays.copyOf(JPEG, 1024 * 1024 + 1);
			perform(createRequest().file(new MockMultipartFile("image", "big.jpg", "image/jpeg", large)), admin)
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.code").value("file_too_large"));
			assertThat(categoryCount()).isZero();
		}

		@Test
		void ignoresProtectedFields() throws Exception {
			perform(createRequest("id", "99", "createdAt", "2020-01-01T00:00:00Z", "updatedAt", "2020-01-01T00:00:00Z",
					"deletedAt", "2020-01-01T00:00:00Z", "image", "../../etc/passwd", "blogCount", "7"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.imageUrl").value(nullValue()))
				.andExpect(jsonPath("$.blogCount").value(0));
			assertThat(column(1, "deleted_at")).isNull();
			assertThat(column(1, "image")).isNull();
			assertThat(column(1, "created_at")).doesNotStartWith("2020");
		}

	}

	@Nested
	class Get {

		@Test
		void returnsCategoryWithBlogCount() throws Exception {
			createCategory();
			insertBlog("first", 1L, false);
			insertBlog("second", 1L, false);
			insertBlog("deleted", 1L, true);

			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.slug").value("home-loans"))
				.andExpect(jsonPath("$.blogCount").value(2));
		}

		@Test
		void returns404ForUnknownOrDeletedCategory() throws Exception {
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("blog_category_not_found"));
			createCategory();
			jdbc.update("UPDATE blog_categories SET deleted_at = now()");
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
		}

		@Test
		void rejectsInvalidIds() throws Exception {
			perform(get(BASE + "/abc"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/1; DROP TABLE blog_categories"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/99999999999999999999"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/-1"), admin).andExpect(status().isNotFound());
		}

		@Test
		void streamsImageOnlyUnderItsCurrentName() throws Exception {
			String imageUrl = json(perform(createRequest().file(png()), admin).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString(), "$.imageUrl");
			perform(get(imageUrl), admin)
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(content().bytes(PNG))
				.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
				.andExpect(header().string("X-Content-Type-Options", "nosniff"));
			perform(get(BASE + "/1/image/other.png"), admin).andExpect(status().isNotFound());
			perform(get(BASE + "/1/image/..%2F..%2Fetc%2Fpasswd"), admin).andExpect(status().is4xxClientError());
		}

	}

	@Nested
	class Update {

		@Test
		void changesOnlyGivenFieldsAndKeepsTheSlug() throws Exception {
			createCategory("icon", "home", "metaTitle", "Loans");
			String before = column(1, "updated_at");

			patchJson(1, "{\"title\":\"  Home Finance \"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("Home Finance"))
				.andExpect(jsonPath("$.slug").value("home-loans"))
				.andExpect(jsonPath("$.icon").value("home"))
				.andExpect(jsonPath("$.metaTitle").value("Loans"))
				.andExpect(jsonPath("$.status").value("active"));
			assertThat(column(1, "updated_at")).isNotEqualTo(before);
		}

		@Test
		void changesSlugStatusAndClearsOptionalFields() throws Exception {
			createCategory("icon", "home", "metaTitle", "Loans", "metaDescription", "About loans");

			patchJson(1, """
					{"slug":"home-finance","status":"inactive","icon":null,"metaTitle":null,"metaDescription":"  "}""", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("home-finance"))
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.icon").value(nullValue()))
				.andExpect(jsonPath("$.metaTitle").value(nullValue()))
				.andExpect(jsonPath("$.metaDescription").value(nullValue()));
		}

		@Test
		void slugMustBeUniqueExceptForItself() throws Exception {
			createCategory();
			createCategory("title", "Guides");

			patchJson(2, "{\"slug\":\"home-loans\"}", admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("blog_category_slug_taken"));
			patchJson(2, "{\"slug\":\"guides\",\"title\":\"Guides 2026\"}", admin).andExpect(status().isOk());
			assertThat(column(2, "slug")).isEqualTo("guides");
		}

		@ParameterizedTest
		@ValueSource(strings = { "title", "slug", "status" })
		void explicitNullIsRejectedForRequiredFields(String field) throws Exception {
			createCategory();
			patchJson(1, "{\"" + field + "\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "title|'\"\"'", "slug|'\"Bad Slug\"'", "status|'\"deleted\"'",
				"icon|'\"<img>\"'", "slug|'[\"a\"]'" })
		void rejectsInvalidValues(String field, String value) throws Exception {
			createCategory();
			patchJson(1, "{\"" + field + "\":" + value + "}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(column(1, "slug")).isEqualTo("home-loans");
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "id|5", "image|'\"../../etc/passwd\"'", "createdAt|'\"2020-01-01T00:00:00Z\"'",
				"updatedAt|'\"2020-01-01T00:00:00Z\"'", "deletedAt|'\"2020-01-01T00:00:00Z\"'", "blogCount|0",
				"imageUrl|'\"https://evil.example/x.png\"'" })
		void rejectsProtectedAndUnknownFields(String field, String value) throws Exception {
			createCategory();
			patchJson(1, "{\"" + field + "\":" + value + "}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(column(1, "image")).isNull();
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void returns404ForUnknownOrDeletedCategory() throws Exception {
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			createCategory();
			jdbc.update("UPDATE blog_categories SET deleted_at = now()");
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			assertThat(column(1, "title")).isEqualTo("Home Loans");
		}

		@Test
		void keepsTheDefaultJsonBodyLimit() throws Exception {
			createCategory();
			patchJson(1, "{\"metaDescription\":\"" + "a".repeat(65 * 1024) + "\"}", admin)
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.code").value("payload_too_large"));
		}

		@Test
		void putIsNotAFullReplacement() throws Exception {
			createCategory();
			perform(put(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\"}"), admin)
				.andExpect(status().isMethodNotAllowed());
		}

		@Test
		void replacesImageAndDeletesTheOldFile() throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String oldKey = column(1, "image");

			perform(multipart(HttpMethod.PUT, BASE + "/1/image")
					.file(new MockMultipartFile("image", "new.jpg", "image/jpeg", JPEG)), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.imageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "jpg"))));
			String newKey = column(1, "image");
			assertThat(newKey).isNotEqualTo(oldKey);
			assertThat(storage.get(newKey).exists()).isTrue();
			assertThat(storage.get(oldKey).exists()).isFalse();
		}

		@Test
		void invalidReplacementKeepsTheCurrentImage() throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String key = column(1, "image");

			perform(multipart(HttpMethod.PUT, BASE + "/1/image")
					.file(new MockMultipartFile("image", "x.png", "image/png", "not an image".getBytes())), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.image").exists());
			perform(multipart(HttpMethod.PUT, BASE + "/1/image"), admin).andExpect(status().isBadRequest());
			assertThat(column(1, "image")).isEqualTo(key);
			assertThat(storage.get(key).exists()).isTrue();
		}

		@Test
		void removesImage() throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String key = column(1, "image");

			perform(delete(BASE + "/1/image"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.imageUrl").value(nullValue()));
			assertThat(column(1, "image")).isNull();
			assertThat(storage.get(key).exists()).isFalse();
			// Nothing to remove: still fine.
			perform(delete(BASE + "/1/image"), admin).andExpect(status().isOk());
		}

	}

	@Nested
	class Delete {

		@Test
		void softDeletesAndKeepsTheImage() throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String key = column(1, "image");

			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());

			assertThat(column(1, "deleted_at")).isNotNull();
			assertThat(categoryCount()).isEqualTo(1);
			assertThat(storage.get(key).exists()).isTrue();
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
			perform(get(BASE), admin).andExpect(jsonPath("$.totalElements").value(0));
			perform(delete(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("blog_category_not_found"));
			perform(delete(BASE + "/2"), admin).andExpect(status().isNotFound());
		}

		@Test
		void refusedWhileBlogsUseTheCategory() throws Exception {
			createCategory();
			insertBlog("draft-post", 1L, false);
			insertBlog("published-post", 1L, false);

			perform(delete(BASE + "/1"), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("blog_category_in_use"))
				.andExpect(jsonPath("$.blogCount").value(2));
			assertThat(column(1, "deleted_at")).isNull();
			assertThat(jdbc.queryForObject("SELECT count(*) FROM blogs WHERE category_id = 1 AND deleted_at IS NULL",
					Integer.class)).isEqualTo(2);
		}

		@Test
		void allowedWhenOnlyDeletedBlogsReferenceIt() throws Exception {
			createCategory();
			insertBlog("old-post", 1L, true);

			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());

			// The deleted blog keeps its row and its (still valid) foreign key.
			assertThat(jdbc.queryForObject("SELECT category_id FROM blogs WHERE slug = 'old-post'", Long.class))
				.isEqualTo(1L);
			assertThat(column(1, "deleted_at")).isNotNull();
		}

	}

	@Nested
	class ListCategories {

		@BeforeEach
		void insertCategories() {
			insert("Home Loans", "home-loans", "active", "2026-06-01T00:00:00Z");
			insert("Interior Design", "interior-design", "inactive", "2026-06-02T00:00:00Z");
			insert("Legal 100% Guide", "legal-guide", "active", "2026-06-03T00:00:00Z");
			insert("Deleted", "deleted", "active", "2026-06-04T00:00:00Z");
			jdbc.update("UPDATE blog_categories SET deleted_at = now() WHERE slug = 'deleted'");
		}

		@Test
		void newestFirstWithPaginationMetadataAndBlogCounts() throws Exception {
			insertBlog("a", 1L, false);
			insertBlog("b", 1L, false);
			insertBlog("c", 3L, false);
			insertBlog("d", 3L, true);

			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].title", contains("Legal 100% Guide", "Interior Design", "Home Loans")))
				.andExpect(jsonPath("$.content[*].blogCount", contains(1, 0, 2)))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(3))
				.andExpect(jsonPath("$.totalPages").value(1));
			list("?size=2&page=1")
				.andExpect(jsonPath("$.content[*].title", contains("Home Loans")))
				.andExpect(jsonPath("$.totalPages").value(2));
			list("?size=1000").andExpect(jsonPath("$.size").value(100));
			list("?page=5").andExpect(jsonPath("$.content", hasSize(0)));
		}

		@Test
		void filters() throws Exception {
			list("?search=LOAN").andExpect(jsonPath("$.content[*].title", contains("Home Loans")));
			list("?search=interior-des").andExpect(jsonPath("$.content[*].title", contains("Interior Design")));
			// LIKE wildcards in the search are literal characters.
			perform(get(BASE).param("search", "100%"), admin)
				.andExpect(jsonPath("$.content[*].title", contains("Legal 100% Guide")));
			perform(get(BASE).param("search", "_"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			perform(get(BASE).param("search", "' OR '1'='1"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			list("?status=inactive").andExpect(jsonPath("$.content[*].title", contains("Interior Design")));
			list("?status=active&search=guide").andExpect(jsonPath("$.content[*].title", contains("Legal 100% Guide")));
			list("?search=deleted").andExpect(jsonPath("$.content", hasSize(0)));
		}

		@Test
		void sortsByAllowedFields() throws Exception {
			list("?sort=title,asc")
				.andExpect(jsonPath("$.content[*].title", contains("Home Loans", "Interior Design", "Legal 100% Guide")));
			list("?sort=slug,desc")
				.andExpect(jsonPath("$.content[*].slug", contains("legal-guide", "interior-design", "home-loans")));
			list("?sort=id,asc").andExpect(jsonPath("$.content[*].id", contains(1, 2, 3)));
			list("?sort=status,asc&sort=title,desc")
				.andExpect(jsonPath("$.content[*].title", contains("Legal 100% Guide", "Home Loans", "Interior Design")));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"sort=image|sort",
				"sort=deletedAt|sort",
				"sort=metaDescription|sort",
				"sort=title;DROP TABLE blog_categories|sort",
				"sort=title,sideways|sort",
				"status=deleted|status" })
		void rejectsInvalidParameters(String query, String errorField) throws Exception {
			list("?" + query)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
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
			createCategory();
			for (String endpoint : ENDPOINTS) {
				mvc.perform(endpoint(endpoint)).andExpect(status().isUnauthorized());
				mvc.perform(endpoint(endpoint).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
					.andExpect(status().isUnauthorized());
			}
			assertThat(categoryCount()).isEqualTo(1);
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void rejectsAppUsersWhateverTheyClaim() throws Exception {
			createCategory();
			registerActiveUser();
			String appUser = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), appUser).andExpect(status().isForbidden());
				// Client-supplied identity or permissions are ignored.
				perform(endpoint(endpoint).param("userId", "1").param("role", "admin").param("userType", "admin")
						.header("X-User-Id", "1").header("X-Role", "admin")
						.header("X-Permissions", "BLOG_CATEGORY_DELETE"), appUser)
					.andExpect(status().isForbidden());
			}
			assertThat(column(1, "title")).isEqualTo("Home Loans");
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void seededAdminRoleIsTheOnlyRoleWithBlogCategoryPermissions() throws Exception {
			assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog_category'", String.class))
				.containsExactly("admin");
			assertThat(jdbc.queryForObject("SELECT (permissions -> 'blog_category')::text FROM roles WHERE slug = 'admin'",
					String.class))
				.isEqualTo("{\"view\": true, \"create\": true, \"delete\": true, \"update\": true}");

			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), admin).andExpect(status().is2xxSuccessful());
			}
		}

		/** Every other blog category permission is not enough; the endpoint's own permission is. */
		@ParameterizedTest(name = "{0} needs blog_category.{1}")
		@MethodSource("com.propertypro.property_platform.cms.blog.AdminBlogCategoryApiTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String action, int successStatus) throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String[] others = ACTIONS.stream().filter(a -> !a.equals(action)).toArray(String[]::new);

			perform(endpoint(endpoint), staff("without", others)).andExpect(status().isForbidden());
			assertThat(categoryCount()).isEqualTo(1);
			assertThat(column(1, "title")).isEqualTo("Home Loans");
			assertThat(column(1, "image")).isNotNull();
			assertThat(column(1, "deleted_at")).isNull();

			perform(endpoint(endpoint), staff("only", action)).andExpect(status().is(successStatus));
		}

		@Test
		void otherModulesPermissionsAreNotEnough() throws Exception {
			createCategory();
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Banners', 'banners', ?::jsonb)",
					"{\"admin_panel\": {\"access\": true}, \"banner\": {\"list\": true, \"view\": true, \"create\": true, "
							+ "\"update\": true, \"delete\": true}, \"blog_category\": {\"view\": false}}");
			account("banners@example.com", "banners");
			String bannerStaff = adminToken("banners@example.com");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), bannerStaff).andExpect(status().isForbidden());
			}
		}

		@Test
		void roleChangesApplyOnTheNextRequest() throws Exception {
			createCategory();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			// Permission revoked.
			jdbc.update("UPDATE roles SET permissions = permissions #- '{blog_category,view}' WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(get(BASE), staff).andExpect(status().isForbidden());
			patchJson(1, "{\"title\":\"Still allowed\"}", staff).andExpect(status().isOk());

			// Role disabled, then deleted.
			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			patchJson(1, "{\"title\":\"X\"}", staff).andExpect(status().isForbidden());
			jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'editor'");
			patchJson(1, "{\"title\":\"X\"}", staff).andExpect(status().isForbidden());
			assertThat(column(1, "title")).isEqualTo("Still allowed");
		}

		@Test
		void userTypeWithoutMatchingRoleIsDenied() throws Exception {
			createCategory();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE users SET user_type = 'no-such-role' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());

			// A matching slug alone is not enough: the role must grant the permission.
			jdbc.update("UPDATE users SET user_type = 'user' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void adminPanelAccessIsRequired() throws Exception {
			createCategory();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");

			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void writesAreRateLimitedPerAdmin() throws Exception {
			createCategory();
			for (int i = 0; i < 119; i++) {
				patchJson(1, "{\"title\":\"Edit " + i + "\"}", admin).andExpect(status().isOk());
			}
			patchJson(1, "{\"title\":\"One too many\"}", admin)
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists(HttpHeaders.RETRY_AFTER));
			// Reads are not limited.
			perform(get(BASE + "/1"), admin).andExpect(status().isOk());
		}

	}

	// ---- Endpoints ----

	/** Delete last, so looping over them leaves category 1 in place for the others. */
	private static final List<String> ENDPOINTS = List.of("list", "view", "create", "update", "image", "download",
			"removeImage", "delete");

	static Stream<Arguments> endpointPermissions() {
		return Stream.of(
				Arguments.of("list", "view", 200),
				Arguments.of("view", "view", 200),
				Arguments.of("download", "view", 200),
				Arguments.of("create", "create", 201),
				Arguments.of("update", "update", 200),
				Arguments.of("image", "update", 200),
				Arguments.of("removeImage", "update", 200),
				Arguments.of("delete", "delete", 204));
	}

	/** A new request for one endpoint, on category 1. */
	private AbstractMockHttpServletRequestBuilder<?> endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> createRequest("title", "Created");
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Changed\"}");
			case "image" -> multipart(HttpMethod.PUT, BASE + "/1/image").file(png());
			case "removeImage" -> delete(BASE + "/1/image");
			case "delete" -> delete(BASE + "/1");
			case "download" -> get(BASE + "/1/image/" + downloadName());
			default -> throw new IllegalArgumentException(name);
		};
	}

	private String downloadName() {
		String key = column(1, "image");
		return key == null ? "none.png" : key.substring(key.lastIndexOf('/') + 1);
	}

	// ---- Helpers ----

	/** Valid create request titled "Home Loans"; {@code overrides} are name/value pairs replacing or adding fields. */
	private MockMultipartHttpServletRequestBuilder createRequest(String... overrides) {
		MockMultipartHttpServletRequestBuilder request = multipart(BASE);
		boolean hasTitle = false;
		for (int i = 0; i < overrides.length; i += 2) {
			request.param(overrides[i], overrides[i + 1]);
			hasTitle |= overrides[i].equals("title");
		}
		return hasTitle ? request : request.param("title", "Home Loans");
	}

	private void createCategory(String... overrides) throws Exception {
		perform(createRequest(overrides), admin).andExpect(status().isCreated());
	}

	private static MockMultipartFile png() {
		return new MockMultipartFile("image", "category.png", "image/png", PNG);
	}

	private ResultActions perform(AbstractMockHttpServletRequestBuilder<?> request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	/** Logs in a staff member whose new role grants admin panel access plus the given blog category actions. */
	private String staff(String slug, String... actions) throws Exception {
		String granted = Arrays.stream(actions).map(a -> "\"" + a + "\": true")
			.reduce((a, b) -> a + ", " + b).orElse("");
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"blog_category\": {" + granted + "}}");
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
		return json(postJson("/api/v1/admin/login", "{\"identifier\":\"%s\",\"password\":\"%s\"}".formatted(email, PASSWORD))
			.andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	private void insert(String title, String slug, String status, String createdAt) {
		jdbc.update("""
				INSERT INTO blog_categories (title, slug, status, created_at, updated_at)
				VALUES (?, ?, ?, CAST(? AS TIMESTAMPTZ), CAST(? AS TIMESTAMPTZ))""",
				title, slug, status, createdAt, createdAt);
	}

	private void insertBlog(String slug, Long categoryId, boolean deleted) {
		jdbc.update("INSERT INTO blogs (title, slug, category_id, deleted_at) VALUES (?, ?, ?, CASE WHEN ? THEN now() END)",
				slug, slug, categoryId, deleted);
	}

	private int categoryCount() {
		return jdbc.queryForObject("SELECT count(*) FROM blog_categories", Integer.class);
	}

	/** One column (or expression) of a category, as text; null when SQL NULL. */
	private String column(long id, String expression) {
		return jdbc.queryForObject("SELECT (" + expression + ")::text FROM blog_categories WHERE id = ?", String.class, id);
	}

	private static byte[] bytes(int... values) {
		byte[] result = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			result[i] = (byte) values[i];
		}
		return result;
	}

}
