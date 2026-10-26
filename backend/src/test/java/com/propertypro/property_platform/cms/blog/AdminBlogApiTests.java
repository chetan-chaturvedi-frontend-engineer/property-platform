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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
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
 * Admin blog management through real admin logins, so every request goes through token validation and
 * the users.user_type = roles.slug permission lookup. Roles changed by a test are restored. Category 1
 * ("home-loans", active) exists in every test.
 */
class AdminBlogApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/blogs";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final List<String> ACTIONS = List.of("view", "create", "update", "delete");
	private static final String CONTENT = "<p>How to apply for a home loan.</p>";
	private static final String FUTURE = "2099-01-01T00:00:00Z";
	/** PNG signature plus padding: enough for content detection. */
	private static final byte[] PNG = bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R');
	private static final byte[] JPEG = bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1);
	private static final String IMAGE_URL = "^/api/v1/admin/blogs/%d/feature-image/[0-9a-f-]{36}\\.%s$";

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private MediaStorage storage;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE blogs, blog_categories RESTART IDENTITY");
		jdbc.update("INSERT INTO blog_categories (title, slug) VALUES ('Home Loans', 'home-loans')");
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
		void createsDraftWithGeneratedSlugAndServerSetFields() throws Exception {
			perform(createRequest("title", "  Home Loan Guide 2026  "), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.title").value("Home Loan Guide 2026"))
				.andExpect(jsonPath("$.slug").value("home-loan-guide-2026"))
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.publicState").value("draft"))
				.andExpect(jsonPath("$.publishedAt").value(nullValue()))
				.andExpect(jsonPath("$.category").value(nullValue()))
				.andExpect(jsonPath("$.content").value(CONTENT))
				.andExpect(jsonPath("$.tags", empty()))
				.andExpect(jsonPath("$.featureImageUrl").value(nullValue()))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty())
				.andExpect(jsonPath("$.featureImage").doesNotExist())
				.andExpect(jsonPath("$.deletedAt").doesNotExist());
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void storesAllFieldsNormalizedTagsAndFeatureImage() throws Exception {
			perform(createRequest("slug", "emi-basics", "categoryId", "1", "shortDescription", "  EMI explained  ",
					"metaTitle", " EMI basics ", "metaDescription", "All about EMIs", "tags", " Home  Loans ",
					"tags", "TAX", "tags", "home loans").file(png()), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("emi-basics"))
				.andExpect(jsonPath("$.category.id").value(1))
				.andExpect(jsonPath("$.category.slug").value("home-loans"))
				.andExpect(jsonPath("$.category.status").value("active"))
				.andExpect(jsonPath("$.shortDescription").value("EMI explained"))
				.andExpect(jsonPath("$.metaTitle").value("EMI basics"))
				.andExpect(jsonPath("$.metaDescription").value("All about EMIs"))
				.andExpect(jsonPath("$.tags", contains("home loans", "tax")))
				.andExpect(jsonPath("$.featureImageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "png"))));
			String key = column(1, "feature_image");
			assertThat(key).matches("blogs/[0-9a-f-]{36}\\.png");
			assertThat(storage.get(key).exists()).isTrue();
			assertThat(column(1, "tags")).isEqualTo("[\"home loans\", \"tax\"]");
		}

		@Test
		void publishesNowByDefaultOrSchedulesForTheGivenTime() throws Exception {
			Instant before = Instant.now().truncatedTo(ChronoUnit.SECONDS);
			String body = perform(createRequest("status", "publish", "categoryId", "1"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("publish"))
				.andExpect(jsonPath("$.publicState").value("live"))
				.andReturn().getResponse().getContentAsString();
			assertThat(Instant.parse(json(body, "$.publishedAt"))).isBetween(before, Instant.now());

			perform(createRequest("title", "Later", "status", "publish", "categoryId", "1", "publishedAt", FUTURE), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.publishedAt").value(FUTURE))
				.andExpect(jsonPath("$.publicState").value("scheduled"));

			// Offsets are accepted; responses and storage are UTC.
			perform(createRequest("title", "Backdated", "status", "publish", "categoryId", "1",
					"publishedAt", "2026-01-01T10:00:00+05:30"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.publishedAt").value("2026-01-01T04:30:00Z"))
				.andExpect(jsonPath("$.publicState").value("live"));
		}

		@Test
		void draftKeepsAPlannedTimeWithoutBecomingVisible() throws Exception {
			perform(createRequest("publishedAt", "2020-01-01T00:00:00Z", "categoryId", "1"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.publishedAt").value("2020-01-01T00:00:00Z"))
				.andExpect(jsonPath("$.publicState").value("draft"));
		}

		@Test
		void publishingInAnInactiveCategoryIsAllowedButHidden() throws Exception {
			jdbc.update("INSERT INTO blog_categories (title, slug, status) VALUES ('Old', 'old', 'inactive')");
			perform(createRequest("status", "publish", "categoryId", "2"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.publicState").value("category_hidden"))
				.andExpect(jsonPath("$.category.status").value("inactive"));
		}

		@Test
		void sanitizesContent() throws Exception {
			perform(createRequest("content", "<p onclick=\"steal()\">Safe<script>alert(1)</script></p>"
					+ "<a href=\"javascript:alert(1)\">x</a><iframe src=\"https://evil.example\"></iframe>"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.content").value("<p>Safe</p><a rel=\"nofollow noopener noreferrer\">x</a>"));
			assertThat(column(1, "content")).doesNotContain("script", "onclick", "javascript", "iframe");
		}

		@Test
		void rejectsContentWithNothingSafeLeft() throws Exception {
			perform(createRequest("content", "<script>alert(1)</script>"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.content").value("must contain text or an image"));
			assertThat(blogCount()).isZero();
		}

		@Test
		void duplicateTitlesGetNumberedSlugsAndDeletedSlugsStayReserved() throws Exception {
			createBlog("title", "Market Update");
			createBlog("title", "Market Update");
			jdbc.update("UPDATE blogs SET deleted_at = now() WHERE id = 2");

			perform(createRequest("title", "market update!"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("market-update-3"));
			perform(createRequest("title", "घर खरीदना"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.slug").value("blog"));
		}

		@Test
		void rejectsTakenSlugIncludingDeletedBlogs() throws Exception {
			createBlog("slug", "guide");
			perform(createRequest("title", "Other", "slug", "guide"), admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("blog_slug_taken"))
				.andExpect(jsonPath("$.field").value("slug"));

			jdbc.update("UPDATE blogs SET deleted_at = now()");
			perform(createRequest("title", "Other", "slug", "guide"), admin).andExpect(status().isConflict());
			assertThat(blogCount()).isEqualTo(1);
		}

		@Test
		void requiresTitleAndContent() throws Exception {
			perform(multipart(BASE), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.title").exists())
				.andExpect(jsonPath("$.errors.content").exists());
			assertThat(blogCount()).isZero();
		}

		@ParameterizedTest(name = "{0}={1}")
		@CsvSource(delimiter = '|', value = {
				"title|''",
				"title|'   '",
				"content|'  '",
				"slug|Home Loans",
				"slug|home--loans",
				"slug|''",
				"status|published",
				"status|archived",
				"categoryId|abc",
				"categoryId|0",
				"categoryId|-1",
				"categoryId|999",
				"publishedAt|tomorrow",
				"publishedAt|2026-13-01T00:00:00Z" })
		void rejectsInvalidField(String field, String value) throws Exception {
			perform(createRequest(field, value), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(blogCount()).isZero();
		}

		@ParameterizedTest
		@ValueSource(strings = { "<b>bold</b>", "-leading", "a/b", "semi;colon", "   " })
		void rejectsMalformedTags(String tag) throws Exception {
			perform(createRequest("tags", "valid", "tags", tag), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['tags[1]']").exists());
			assertThat(blogCount()).isZero();
		}

		@Test
		void limitsTagCountAndLength() throws Exception {
			String[] tooMany = IntStream.range(0, 21).boxed().flatMap(i -> Stream.of("tags", "tag" + i)).toArray(String[]::new);
			perform(createRequest(tooMany), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.tags").exists());
			perform(createRequest("tags", "t".repeat(51)), admin).andExpect(status().isBadRequest());
			assertThat(blogCount()).isZero();

			String[] max = IntStream.range(0, 20).boxed().flatMap(i -> Stream.of("tags", "tag" + i)).toArray(String[]::new);
			perform(createRequest(max), admin).andExpect(status().isCreated()).andExpect(jsonPath("$.tags", hasSize(20)));
		}

		@Test
		void rejectsDeletedCategoryAndPublishingWithoutCategory() throws Exception {
			jdbc.update("INSERT INTO blog_categories (title, slug, deleted_at) VALUES ('Gone', 'gone', now())");
			perform(createRequest("categoryId", "2"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.categoryId").value("must be an existing blog category"));
			perform(createRequest("status", "publish"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.categoryId").value("is required to publish"));
			assertThat(blogCount()).isZero();
		}

		@ParameterizedTest(name = "{0} longer than {1}")
		@CsvSource({ "title,255", "slug,255", "shortDescription,1000", "content,100000", "metaTitle,255",
				"metaDescription,1000" })
		void rejectsTooLongValues(String field, int maxLength) throws Exception {
			perform(createRequest(field, "a".repeat(maxLength + 1)), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(blogCount()).isZero();
		}

		@Test
		void rejectsFilesThatAreNotImages() throws Exception {
			MockMultipartFile svg = new MockMultipartFile("featureImage", "a.png", "image/png", "<svg onload=alert(1)>".getBytes());
			MockMultipartFile pdf = new MockMultipartFile("featureImage", "a.pdf", "image/png", "%PDF-1.7 fake".getBytes());
			MockMultipartFile renamed = new MockMultipartFile("featureImage", "a.jpg", "image/jpeg", PNG);
			MockMultipartFile script = new MockMultipartFile("featureImage", "x.php", "image/png", "<?php echo 1;".getBytes());
			MockMultipartFile empty = new MockMultipartFile("featureImage", "e.png", "image/png", new byte[0]);
			for (MockMultipartFile file : List.of(svg, pdf, renamed, script, empty)) {
				perform(createRequest().file(file), admin)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.errors.featureImage").exists());
			}
			assertThat(blogCount()).isZero();
		}

		@Test
		void rejectsOversizedImage() throws Exception {
			byte[] large = Arrays.copyOf(JPEG, 1024 * 1024 + 1);
			perform(createRequest().file(new MockMultipartFile("featureImage", "big.jpg", "image/jpeg", large)), admin)
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.code").value("file_too_large"));
			assertThat(blogCount()).isZero();
		}

		@Test
		void ignoresProtectedFields() throws Exception {
			perform(createRequest("id", "99", "createdAt", "2020-01-01T00:00:00Z", "updatedAt", "2020-01-01T00:00:00Z",
					"deletedAt", "2020-01-01T00:00:00Z", "featureImage", "../../etc/passwd", "publicState", "live"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.featureImageUrl").value(nullValue()))
				.andExpect(jsonPath("$.publicState").value("draft"));
			assertThat(column(1, "deleted_at")).isNull();
			assertThat(column(1, "feature_image")).isNull();
			assertThat(column(1, "created_at")).doesNotStartWith("2020");
		}

	}

	@Nested
	class Get {

		@Test
		void returnsDraftWithFullContentAndCategory() throws Exception {
			createBlog("categoryId", "1", "tags", "tax");
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.content").value(CONTENT))
				.andExpect(jsonPath("$.category.title").value("Home Loans"))
				.andExpect(jsonPath("$.tags", contains("tax")));
		}

		@Test
		void returns404ForUnknownOrDeletedBlog() throws Exception {
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("blog_not_found"));
			createBlog();
			jdbc.update("UPDATE blogs SET deleted_at = now()");
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
		}

		@Test
		void rejectsInvalidIds() throws Exception {
			perform(get(BASE + "/abc"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/1 OR 1=1"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/99999999999999999999"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/-1"), admin).andExpect(status().isNotFound());
		}

		@Test
		void streamsFeatureImageOnlyUnderItsCurrentName() throws Exception {
			String imageUrl = json(perform(createRequest().file(png()), admin).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString(), "$.featureImageUrl");
			perform(get(imageUrl), admin)
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(content().bytes(PNG))
				.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
				.andExpect(header().string("X-Content-Type-Options", "nosniff"));
			perform(get(BASE + "/1/feature-image/other.png"), admin).andExpect(status().isNotFound());
		}

	}

	@Nested
	class Update {

		@Test
		void changesOnlyGivenFieldsAndKeepsTheSlug() throws Exception {
			createBlog("categoryId", "1", "metaTitle", "Meta", "tags", "tax");
			String before = column(1, "updated_at");

			patchJson(1, "{\"title\":\"  A New Title \"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("A New Title"))
				.andExpect(jsonPath("$.slug").value("home-loan-guide"))
				.andExpect(jsonPath("$.metaTitle").value("Meta"))
				.andExpect(jsonPath("$.tags", contains("tax")))
				.andExpect(jsonPath("$.category.id").value(1))
				.andExpect(jsonPath("$.content").value(CONTENT));
			assertThat(column(1, "updated_at")).isNotEqualTo(before);
		}

		@Test
		void changesSlugCategoryTagsAndClearsOptionalFields() throws Exception {
			createBlog("categoryId", "1", "shortDescription", "Short", "metaTitle", "Meta", "tags", "tax");
			jdbc.update("INSERT INTO blog_categories (title, slug) VALUES ('Legal', 'legal')");

			patchJson(1, """
					{"slug":"new-slug","categoryId":2,"tags":["Stamp Duty","stamp duty"],"shortDescription":null,
					 "metaTitle":"  ","metaDescription":"Desc"}""", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.slug").value("new-slug"))
				.andExpect(jsonPath("$.category.slug").value("legal"))
				.andExpect(jsonPath("$.tags", contains("stamp duty")))
				.andExpect(jsonPath("$.shortDescription").value(nullValue()))
				.andExpect(jsonPath("$.metaTitle").value(nullValue()))
				.andExpect(jsonPath("$.metaDescription").value("Desc"));

			patchJson(1, "{\"tags\":null,\"categoryId\":null}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.tags", empty()))
				.andExpect(jsonPath("$.category").value(nullValue()));
			assertThat(column(1, "tags")).isNull();
		}

		@Test
		void draftToPublishSetsNowAndPublishToDraftHidesIt() throws Exception {
			createBlog("categoryId", "1");
			Instant before = Instant.now().truncatedTo(ChronoUnit.SECONDS);

			String body = patchJson(1, "{\"status\":\"publish\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("publish"))
				.andExpect(jsonPath("$.publicState").value("live"))
				.andReturn().getResponse().getContentAsString();
			String publishedAt = json(body, "$.publishedAt");
			assertThat(Instant.parse(publishedAt)).isBetween(before, Instant.now());

			// Editing a published blog keeps its publication time.
			patchJson(1, "{\"title\":\"Edited\"}", admin).andExpect(jsonPath("$.publishedAt").value(publishedAt));

			patchJson(1, "{\"status\":\"draft\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("draft"))
				.andExpect(jsonPath("$.publicState").value("draft"))
				.andExpect(jsonPath("$.publishedAt").value(publishedAt));
		}

		@Test
		void schedulesAndReschedules() throws Exception {
			createBlog("categoryId", "1");

			patchJson(1, "{\"status\":\"publish\",\"publishedAt\":\"" + FUTURE + "\"}", admin)
				.andExpect(jsonPath("$.publicState").value("scheduled"))
				.andExpect(jsonPath("$.publishedAt").value(FUTURE));
			patchJson(1, "{\"publishedAt\":\"2026-01-01T00:00:00Z\"}", admin)
				.andExpect(jsonPath("$.status").value("publish"))
				.andExpect(jsonPath("$.publicState").value("live"));
			// A planned time on a draft does not publish it.
			patchJson(1, "{\"status\":\"draft\",\"publishedAt\":\"2025-01-01T00:00:00Z\"}", admin)
				.andExpect(jsonPath("$.publicState").value("draft"))
				.andExpect(jsonPath("$.publishedAt").value("2025-01-01T00:00:00Z"));
			patchJson(1, "{\"publishedAt\":null}", admin).andExpect(jsonPath("$.publishedAt").value(nullValue()));
		}

		@Test
		void publishedBlogsKeepTheirPublicationRequirements() throws Exception {
			createBlog("categoryId", "1", "status", "publish");

			patchJson(1, "{\"publishedAt\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.publishedAt").exists());
			patchJson(1, "{\"categoryId\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.categoryId").value("is required to publish"));
			patchJson(1, "{\"categoryId\":999}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.categoryId").value("must be an existing blog category"));
			assertThat(column(1, "category_id")).isEqualTo("1");
			assertThat(column(1, "published_at")).isNotNull();

			createBlog("title", "Draft");
			patchJson(2, "{\"status\":\"publish\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.categoryId").exists());
			assertThat(column(2, "status")).isEqualTo("draft");
		}

		@Test
		void slugMustBeUniqueExceptForItself() throws Exception {
			createBlog();
			createBlog("title", "Second");

			patchJson(2, "{\"slug\":\"home-loan-guide\"}", admin)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("blog_slug_taken"));
			patchJson(2, "{\"slug\":\"second\",\"title\":\"Second edition\"}", admin).andExpect(status().isOk());
			assertThat(column(2, "slug")).isEqualTo("second");
		}

		@Test
		void sanitizesContentAndAcceptsLongArticles() throws Exception {
			createBlog();
			patchJson(1, "{\"content\":\"<p>Ok</p><img src=x onerror=alert(1)>\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").value("<p>Ok</p><img>"));

			// Larger than the default 64 KB JSON limit, within the blog limit.
			String article = "<p>" + "ई".repeat(99_990) + "</p>";
			patchJson(1, "{\"content\":\"" + article + "\"}", admin).andExpect(status().isOk());
			assertThat(column(1, "length(content)")).isEqualTo("99997");

			patchJson(1, "{\"content\":\"<p>" + "a".repeat(100_000) + "</p>\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.content").exists());
		}

		@Test
		void rejectsBodiesAboveTheBlogLimit() throws Exception {
			createBlog();
			patchJson(1, "{\"content\":\"" + "a".repeat(1024 * 1024) + "\"}", admin)
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.code").value("payload_too_large"));
		}

		@ParameterizedTest
		@ValueSource(strings = { "title", "slug", "content", "status" })
		void explicitNullIsRejectedForRequiredFields(String field) throws Exception {
			createBlog();
			patchJson(1, "{\"" + field + "\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "title|'\"\"'", "slug|'\"Bad Slug\"'", "status|'\"published\"'",
				"categoryId|0", "categoryId|'\"abc\"'", "tags|'\"not-a-list\"'", "publishedAt|'\"soon\"'",
				"content|'\"<script></script>\"'" })
		void rejectsInvalidValues(String field, String value) throws Exception {
			createBlog();
			patchJson(1, "{\"" + field + "\":" + value + "}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(column(1, "title")).isEqualTo("Home loan guide");
			assertThat(column(1, "status")).isEqualTo("draft");
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "id|5", "featureImage|'\"../../etc/passwd\"'",
				"createdAt|'\"2020-01-01T00:00:00Z\"'", "updatedAt|'\"2020-01-01T00:00:00Z\"'",
				"deletedAt|'\"2020-01-01T00:00:00Z\"'", "publicState|'\"live\"'", "featureImageUrl|'\"https://x/y.png\"'" })
		void rejectsProtectedAndUnknownFields(String field, String value) throws Exception {
			createBlog();
			patchJson(1, "{\"" + field + "\":" + value + "}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(column(1, "feature_image")).isNull();
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void returns404ForUnknownOrDeletedBlog() throws Exception {
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			createBlog();
			jdbc.update("UPDATE blogs SET deleted_at = now()");
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			assertThat(column(1, "title")).isEqualTo("Home loan guide");
		}

		@Test
		void putIsNotAFullReplacement() throws Exception {
			createBlog();
			perform(put(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"X\"}"), admin)
				.andExpect(status().isMethodNotAllowed());
		}

		@Test
		void replacesAndRemovesTheFeatureImage() throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String oldKey = column(1, "feature_image");

			perform(multipart(HttpMethod.PUT, BASE + "/1/feature-image")
					.file(new MockMultipartFile("featureImage", "new.jpg", "image/jpeg", JPEG)), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.featureImageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "jpg"))));
			String newKey = column(1, "feature_image");
			assertThat(storage.get(newKey).exists()).isTrue();
			assertThat(storage.get(oldKey).exists()).isFalse();

			perform(multipart(HttpMethod.PUT, BASE + "/1/feature-image")
					.file(new MockMultipartFile("featureImage", "x.png", "image/png", "nope".getBytes())), admin)
				.andExpect(status().isBadRequest());
			assertThat(column(1, "feature_image")).isEqualTo(newKey);

			perform(delete(BASE + "/1/feature-image"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.featureImageUrl").value(nullValue()));
			assertThat(storage.get(newKey).exists()).isFalse();
		}

	}

	@Nested
	class Delete {

		@Test
		void softDeletesAndKeepsImageAndCategory() throws Exception {
			perform(createRequest("categoryId", "1", "status", "publish").file(png()), admin).andExpect(status().isCreated());
			String key = column(1, "feature_image");

			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());

			assertThat(column(1, "deleted_at")).isNotNull();
			assertThat(blogCount()).isEqualTo(1);
			assertThat(storage.get(key).exists()).isTrue();
			assertThat(jdbc.queryForObject("SELECT count(*) FROM blog_categories WHERE id = 1 AND deleted_at IS NULL",
					Integer.class)).isEqualTo(1);
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
			perform(get(BASE), admin).andExpect(jsonPath("$.totalElements").value(0));
			perform(get("/api/v1/public/blogs/home-loan-guide")).andExpect(status().isNotFound());
			perform(delete(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("blog_not_found"));
			perform(delete(BASE + "/2"), admin).andExpect(status().isNotFound());
			// The category can now be deleted: only deleted blogs reference it.
			perform(delete("/api/v1/admin/blog-categories/1"), admin).andExpect(status().isNoContent());
		}

	}

	@Nested
	class ListBlogs {

		@BeforeEach
		void insertBlogs() {
			jdbc.update("INSERT INTO blog_categories (title, slug) VALUES ('Legal', 'legal')");
			insert("Home loan basics", "home-loan-basics", 1L, "publish", "2026-03-01T00:00:00Z", "[\"tax\", \"emi\"]",
					"2026-02-01T00:00:00Z");
			insert("Stamp duty 100% guide", "stamp-duty-guide", 2L, "draft", null, "[\"tax\"]", "2026-02-02T00:00:00Z");
			insert("Upcoming rules", "upcoming-rules", 2L, "publish", FUTURE, null, "2026-02-03T00:00:00Z");
			insert("Deleted post", "deleted-post", 1L, "publish", "2026-03-02T00:00:00Z", null, "2026-02-04T00:00:00Z");
			jdbc.update("UPDATE blogs SET deleted_at = now() WHERE slug = 'deleted-post'");
		}

		@Test
		void listsDraftsScheduledAndPublishedWithoutContent() throws Exception {
			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].slug", contains("upcoming-rules", "stamp-duty-guide", "home-loan-basics")))
				.andExpect(jsonPath("$.content[*].publicState", contains("scheduled", "draft", "live")))
				.andExpect(jsonPath("$.content[0].category.slug").value("legal"))
				.andExpect(jsonPath("$.content[0].content").doesNotExist())
				.andExpect(jsonPath("$.content[0].metaTitle").doesNotExist())
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(3))
				.andExpect(jsonPath("$.totalPages").value(1));
			list("?size=2&page=1").andExpect(jsonPath("$.content[*].slug", contains("home-loan-basics")));
			list("?size=1000").andExpect(jsonPath("$.size").value(100));
		}

		@Test
		void filters() throws Exception {
			list("?search=HOME").andExpect(jsonPath("$.content[*].slug", contains("home-loan-basics")));
			list("?search=upcoming-ru").andExpect(jsonPath("$.content[*].slug", contains("upcoming-rules")));
			perform(get(BASE).param("search", "100%"), admin)
				.andExpect(jsonPath("$.content[*].slug", contains("stamp-duty-guide")));
			perform(get(BASE).param("search", "_"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			list("?status=draft").andExpect(jsonPath("$.content[*].slug", contains("stamp-duty-guide")));
			list("?status=publish").andExpect(jsonPath("$.content", hasSize(2)));
			list("?categoryId=2").andExpect(jsonPath("$.content[*].slug", contains("upcoming-rules", "stamp-duty-guide")));
			list("?tag=TAX").andExpect(jsonPath("$.content[*].slug", contains("stamp-duty-guide", "home-loan-basics")));
			list("?tag=emi&status=publish").andExpect(jsonPath("$.content[*].slug", contains("home-loan-basics")));
			list("?publishedFrom=2026-03-01T00:00:00Z&publishedTo=2026-12-31T00:00:00Z")
				.andExpect(jsonPath("$.content[*].slug", contains("home-loan-basics")));
			list("?createdFrom=2026-02-02T00:00:00Z&createdTo=2026-02-02T23:59:59Z")
				.andExpect(jsonPath("$.content[*].slug", contains("stamp-duty-guide")));
			list("?search=deleted").andExpect(jsonPath("$.content", hasSize(0)));
		}

		@Test
		void sortsByAllowedFields() throws Exception {
			list("?sort=title,asc")
				.andExpect(jsonPath("$.content[*].slug", contains("home-loan-basics", "stamp-duty-guide", "upcoming-rules")));
			list("?sort=publishedAt,desc")
				.andExpect(jsonPath("$.content[*].slug", contains("stamp-duty-guide", "upcoming-rules", "home-loan-basics")));
			list("?sort=id,asc").andExpect(jsonPath("$.content[*].id", contains(1, 2, 3)));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"sort=content|sort",
				"sort=featureImage|sort",
				"sort=deletedAt|sort",
				"sort=title;DROP TABLE blogs|sort",
				"sort=title,sideways|sort",
				"status=published|status",
				"categoryId=abc|categoryId",
				"categoryId=0|categoryId",
				"tag=<b>|tag",
				"publishedFrom=yesterday|publishedFrom",
				"createdFrom=2026-03-01T00:00:00Z&createdTo=2026-02-01T00:00:00Z|createdTo",
				"publishedFrom=2026-03-01T00:00:00Z&publishedTo=2026-02-01T00:00:00Z|publishedTo" })
		void rejectsInvalidParameters(String query, String errorField) throws Exception {
			list("?" + query)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
		}

		private ResultActions list(String query) throws Exception {
			return perform(get(BASE + query.replace(" ", "%20").replace("<", "%3C").replace(">", "%3E")), admin);
		}

	}

	@Nested
	class Access {

		@Test
		void requiresAuthentication() throws Exception {
			createBlog();
			for (String endpoint : ENDPOINTS) {
				mvc.perform(endpoint(endpoint)).andExpect(status().isUnauthorized());
				mvc.perform(endpoint(endpoint).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
					.andExpect(status().isUnauthorized());
			}
			assertThat(blogCount()).isEqualTo(1);
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void rejectsAppUsersWhateverTheyClaim() throws Exception {
			createBlog();
			registerActiveUser();
			String appUser = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), appUser).andExpect(status().isForbidden());
				perform(endpoint(endpoint).param("userId", "1").param("role", "admin").param("userType", "admin")
						.param("permissions", "BLOG_DELETE").header("X-User-Id", "1").header("X-Role", "admin")
						.header("X-Permissions", "BLOG_DELETE"), appUser)
					.andExpect(status().isForbidden());
			}
			assertThat(column(1, "title")).isEqualTo("Home loan guide");
			assertThat(column(1, "deleted_at")).isNull();
		}

		@Test
		void seededAdminRoleIsTheOnlyRoleWithBlogPermissions() throws Exception {
			assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog'", String.class))
				.containsExactly("admin");
			assertThat(jdbc.queryForObject("SELECT (permissions -> 'blog')::text FROM roles WHERE slug = 'admin'",
					String.class))
				.isEqualTo("{\"view\": true, \"create\": true, \"delete\": true, \"update\": true}");

			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), admin).andExpect(status().is2xxSuccessful());
			}
		}

		/** Every other blog permission is not enough; the endpoint's own permission is. */
		@ParameterizedTest(name = "{0} needs blog.{1}")
		@MethodSource("com.propertypro.property_platform.cms.blog.AdminBlogApiTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String action, int successStatus) throws Exception {
			perform(createRequest().file(png()), admin).andExpect(status().isCreated());
			String[] others = ACTIONS.stream().filter(a -> !a.equals(action)).toArray(String[]::new);

			perform(endpoint(endpoint), staff("without", others)).andExpect(status().isForbidden());
			assertThat(blogCount()).isEqualTo(1);
			assertThat(column(1, "title")).isEqualTo("Home loan guide");
			assertThat(column(1, "feature_image")).isNotNull();
			assertThat(column(1, "deleted_at")).isNull();

			perform(endpoint(endpoint), staff("only", action)).andExpect(status().is(successStatus));
		}

		@Test
		void blogCategoryPermissionsAreNotEnough() throws Exception {
			createBlog();
			jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES ('Categories', 'categories', ?::jsonb)",
					"{\"admin_panel\": {\"access\": true}, \"blog_category\": {\"view\": true, \"create\": true, "
							+ "\"update\": true, \"delete\": true}, \"blog\": {\"view\": false}}");
			account("categories@example.com", "categories");
			String categoryStaff = adminToken("categories@example.com");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), categoryStaff).andExpect(status().isForbidden());
			}
		}

		@Test
		void roleChangesApplyOnTheNextRequest() throws Exception {
			createBlog();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET permissions = permissions #- '{blog,view}' WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			perform(get(BASE), staff).andExpect(status().isForbidden());
			patchJson(1, "{\"title\":\"Still allowed\"}", staff).andExpect(status().isOk());

			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			patchJson(1, "{\"title\":\"X\"}", staff).andExpect(status().isForbidden());
			jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'editor'");
			patchJson(1, "{\"title\":\"X\"}", staff).andExpect(status().isForbidden());
			assertThat(column(1, "title")).isEqualTo("Still allowed");
		}

		@Test
		void userTypeWithoutMatchingRoleIsDenied() throws Exception {
			createBlog();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE users SET user_type = 'no-such-role' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());

			jdbc.update("UPDATE users SET user_type = 'user' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void adminPanelAccessIsRequired() throws Exception {
			createBlog();
			String staff = staff("editor", ACTIONS.toArray(String[]::new));
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");

			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void writesAreRateLimitedPerAdmin() throws Exception {
			createBlog();
			for (int i = 0; i < 299; i++) {
				patchJson(1, "{\"title\":\"Edit " + i + "\"}", admin).andExpect(status().isOk());
			}
			patchJson(1, "{\"title\":\"One too many\"}", admin)
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists(HttpHeaders.RETRY_AFTER));
			perform(get(BASE + "/1"), admin).andExpect(status().isOk());
		}

	}

	// ---- Endpoints ----

	/** Delete last, so looping over them leaves blog 1 in place for the others. */
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

	/** A new request for one endpoint, on blog 1. */
	private AbstractMockHttpServletRequestBuilder<?> endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> createRequest("title", "Created");
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Changed\"}");
			case "image" -> multipart(HttpMethod.PUT, BASE + "/1/feature-image").file(png());
			case "removeImage" -> delete(BASE + "/1/feature-image");
			case "delete" -> delete(BASE + "/1");
			case "download" -> get(BASE + "/1/feature-image/" + downloadName());
			default -> throw new IllegalArgumentException(name);
		};
	}

	private String downloadName() {
		String key = column(1, "feature_image");
		return key == null ? "none.png" : key.substring(key.lastIndexOf('/') + 1);
	}

	// ---- Helpers ----

	/**
	 * Valid create request (title "Home loan guide", {@link #CONTENT}); {@code overrides} are name/value
	 * pairs replacing or adding fields (a repeated name adds values).
	 */
	private MockMultipartHttpServletRequestBuilder createRequest(String... overrides) {
		MockMultipartHttpServletRequestBuilder request = multipart(BASE);
		boolean hasTitle = false;
		boolean hasContent = false;
		for (int i = 0; i < overrides.length; i += 2) {
			request.param(overrides[i], overrides[i + 1]);
			hasTitle |= overrides[i].equals("title");
			hasContent |= overrides[i].equals("content");
		}
		if (!hasTitle) {
			request.param("title", "Home loan guide");
		}
		return hasContent ? request : request.param("content", CONTENT);
	}

	private void createBlog(String... overrides) throws Exception {
		perform(createRequest(overrides), admin).andExpect(status().isCreated());
	}

	private static MockMultipartFile png() {
		return new MockMultipartFile("featureImage", "feature.png", "image/png", PNG);
	}

	private ResultActions perform(AbstractMockHttpServletRequestBuilder<?> request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions perform(AbstractMockHttpServletRequestBuilder<?> request) throws Exception {
		return mvc.perform(request);
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	/** Logs in a staff member whose new role grants admin panel access plus the given blog actions. */
	private String staff(String slug, String... actions) throws Exception {
		String granted = Arrays.stream(actions).map(a -> "\"" + a + "\": true")
			.reduce((a, b) -> a + ", " + b).orElse("");
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"blog\": {" + granted + "}}");
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

	private void insert(String title, String slug, Long categoryId, String status, String publishedAt, String tags,
			String createdAt) {
		jdbc.update("""
				INSERT INTO blogs (title, slug, category_id, content, status, published_at, tags, created_at, updated_at)
				VALUES (?, ?, ?, '<p>Body</p>', ?, CAST(? AS TIMESTAMPTZ), CAST(? AS JSONB), CAST(? AS TIMESTAMPTZ),
				    CAST(? AS TIMESTAMPTZ))""",
				title, slug, categoryId, status, publishedAt, tags, createdAt, createdAt);
	}

	private int blogCount() {
		return jdbc.queryForObject("SELECT count(*) FROM blogs", Integer.class);
	}

	/** One column (or expression) of a blog, as text; null when SQL NULL. */
	private String column(long id, String expression) {
		return jdbc.queryForObject("SELECT (" + expression + ")::text FROM blogs WHERE id = ?", String.class, id);
	}

	private static byte[] bytes(int... values) {
		byte[] result = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			result[i] = (byte) values[i];
		}
		return result;
	}

}
