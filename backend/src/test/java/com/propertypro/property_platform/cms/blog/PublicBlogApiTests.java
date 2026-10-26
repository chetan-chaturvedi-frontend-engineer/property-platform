package com.propertypro.property_platform.cms.blog;

import com.propertypro.property_platform.media.storage.MediaStorage;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Public blog and category endpoints, without login. Every test starts with:
 * <ul>
 * <li>categories 1 "home-loans" (active), 2 "legal" (active), 3 "archive" (inactive), 4 "gone" (deleted);</li>
 * <li>live blogs "newest" (home-loans, tags tax/emi) and "older" (legal), and hidden ones in every
 * other state: draft, scheduled, deleted, without category, in the inactive and in the deleted category.</li>
 * </ul>
 */
class PublicBlogApiTests extends AbstractIntegrationTest {

	private static final String BLOGS = "/api/v1/public/blogs";
	private static final String CATEGORIES = "/api/v1/public/blog-categories";
	private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R' };
	private static final String[] HIDDEN = { "draft", "scheduled", "deleted", "no-category", "inactive-category",
			"deleted-category" };

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private MediaStorage storage;

	@BeforeEach
	void insertContent() {
		jdbc.execute("TRUNCATE blogs, blog_categories RESTART IDENTITY");
		jdbc.update("""
				INSERT INTO blog_categories (title, slug, status, meta_title, meta_description, deleted_at) VALUES
				    ('Home Loans', 'home-loans', 'active', NULL, 'Loan guides', NULL),
				    ('Legal', 'legal', 'active', 'Legal guides', NULL, NULL),
				    ('Archive', 'archive', 'inactive', NULL, NULL, NULL),
				    ('Gone', 'gone', 'active', NULL, NULL, now())""");
		blog("newest", 1L, "publish", "now() - interval '1 hour'", "[\"tax\", \"emi\"]");
		blog("older", 2L, "publish", "now() - interval '2 days'", null);
		blog("draft", 1L, "draft", "now() - interval '1 day'", "[\"tax\"]");
		blog("scheduled", 1L, "publish", "now() + interval '1 day'", "[\"tax\"]");
		blog("deleted", 1L, "publish", "now() - interval '1 day'", "[\"tax\"]");
		jdbc.update("UPDATE blogs SET deleted_at = now() WHERE slug = 'deleted'");
		blog("no-category", null, "publish", "now() - interval '1 day'", null);
		blog("inactive-category", 3L, "publish", "now() - interval '1 day'", null);
		blog("deleted-category", 4L, "publish", "now() - interval '1 day'", null);
		jdbc.update("""
				UPDATE blogs SET short_description = 'EMI and tax benefits', meta_title = 'Newest SEO title',
				    feature_image = 'blogs/0b5c7c1e-3a8d-4b8e-9f00-1234567890ab.png' WHERE slug = 'newest'""");
	}

	@Test
	void listsOnlyVisibleBlogsNewestFirstWithoutLogin() throws Exception {
		mvc.perform(get(BLOGS))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.content[*].slug", contains("newest", "older")))
			.andExpect(jsonPath("$.page").value(0))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.totalElements").value(2))
			.andExpect(jsonPath("$.totalPages").value(1));
		mvc.perform(get(BLOGS).param("size", "1").param("page", "1"))
			.andExpect(jsonPath("$.content[*].slug", contains("older")))
			.andExpect(jsonPath("$.totalPages").value(2));
	}

	@Test
	void listItemsContainOnlyPublicFieldsWithSeoFallbacks() throws Exception {
		mvc.perform(get(BLOGS))
			.andExpect(jsonPath("$.content[0].id").value(1))
			.andExpect(jsonPath("$.content[0].title").value("newest"))
			.andExpect(jsonPath("$.content[0].shortDescription").value("EMI and tax benefits"))
			.andExpect(jsonPath("$.content[0].featureImageUrl")
				.value("/api/v1/public/blogs/newest/feature-image/0b5c7c1e-3a8d-4b8e-9f00-1234567890ab.png"))
			.andExpect(jsonPath("$.content[0].category.title").value("Home Loans"))
			.andExpect(jsonPath("$.content[0].category.slug").value("home-loans"))
			.andExpect(jsonPath("$.content[0].tags", contains("tax", "emi")))
			.andExpect(jsonPath("$.content[0].publishedAt").isNotEmpty())
			.andExpect(jsonPath("$.content[0].metaTitle").value("Newest SEO title"))
			.andExpect(jsonPath("$.content[0].metaDescription").value("EMI and tax benefits"))
			// Fallbacks: no meta fields -> title and short description.
			.andExpect(jsonPath("$.content[1].metaTitle").value("older"))
			.andExpect(jsonPath("$.content[1].metaDescription").value(nullValue()))
			.andExpect(jsonPath("$.content[1].tags", empty()))
			.andExpect(jsonPath("$.content[1].featureImageUrl").value(nullValue()));
		for (String adminField : new String[] { "content", "status", "publicState", "createdAt", "updatedAt", "deletedAt",
				"featureImage", "categoryId" }) {
			mvc.perform(get(BLOGS)).andExpect(jsonPath("$.content[0]." + adminField).doesNotExist());
		}
		mvc.perform(get(BLOGS)).andExpect(jsonPath("$.content[0].category.id").doesNotExist())
			.andExpect(jsonPath("$.content[0].category.status").doesNotExist());
	}

	@Test
	void parametersCannotOverrideVisibilityOrOrder() throws Exception {
		mvc.perform(get(BLOGS).param("status", "draft").param("includeDrafts", "true").param("deleted", "true")
				.param("publishedAt", "2099-01-01T00:00:00Z").param("sort", "publishedAt,asc").param("sort", "slug,asc")
				.param("categoryStatus", "inactive").param("now", "2099-01-01T00:00:00Z"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].slug", contains("newest", "older")));
	}

	@Test
	void filters() throws Exception {
		mvc.perform(get(BLOGS).param("category", "legal")).andExpect(jsonPath("$.content[*].slug", contains("older")));
		mvc.perform(get(BLOGS).param("category", "archive")).andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get(BLOGS).param("category", "no-such")).andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get(BLOGS).param("tag", " TAX ")).andExpect(jsonPath("$.content[*].slug", contains("newest")));
		mvc.perform(get(BLOGS).param("search", "OLD")).andExpect(jsonPath("$.content[*].slug", contains("older")));
		mvc.perform(get(BLOGS).param("search", "tax benefits")).andExpect(jsonPath("$.content[*].slug", contains("newest")));
		mvc.perform(get(BLOGS).param("search", "draft")).andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get(BLOGS).param("search", "%")).andExpect(jsonPath("$.content", hasSize(0)));
		mvc.perform(get(BLOGS).param("search", "' OR '1'='1")).andExpect(jsonPath("$.content", hasSize(0)));
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = { "category|Not A Slug", "category|legal'--", "tag|<script>", "tag|-x" })
	void rejectsInvalidFilters(String parameter, String value) throws Exception {
		mvc.perform(get(BLOGS).param(parameter, value))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors." + parameter).exists());
		mvc.perform(get(BLOGS).param("search", "a".repeat(101))).andExpect(status().isBadRequest());
	}

	@Test
	void returnsEmptyPageWhenNothingIsVisible() throws Exception {
		jdbc.update("UPDATE blogs SET status = 'draft'");
		mvc.perform(get(BLOGS))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content", empty()))
			.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void detailReturnsFullBlogBySlug() throws Exception {
		mvc.perform(get(BLOGS + "/newest"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.slug").value("newest"))
			.andExpect(jsonPath("$.content").value("<p>Body of newest</p>"))
			.andExpect(jsonPath("$.category.slug").value("home-loans"))
			.andExpect(jsonPath("$.tags", contains("tax", "emi")))
			.andExpect(jsonPath("$.metaTitle").value("Newest SEO title"))
			.andExpect(jsonPath("$.status").doesNotExist())
			.andExpect(jsonPath("$.deletedAt").doesNotExist())
			.andExpect(jsonPath("$.createdAt").doesNotExist());
	}

	/** Same response for hidden and unknown blogs, so a hidden blog's existence is not revealed. */
	@ParameterizedTest
	@ValueSource(strings = { "draft", "scheduled", "deleted", "no-category", "inactive-category", "deleted-category",
			"no-such-blog", "Newest", "newest--x", "newest_x", "-newest" })
	void detailIs404UnlessVisible(String slug) throws Exception {
		mvc.perform(get(BLOGS + "/" + slug))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("blog_not_found"))
			.andExpect(jsonPath("$.detail").value("Blog not found."));
	}

	@Test
	void hiddenBlogsAreHiddenEverywhereTheListAndDetailAgree() throws Exception {
		String body = mvc.perform(get(BLOGS).param("size", "100")).andReturn().getResponse().getContentAsString();
		for (String slug : HIDDEN) {
			assertThat(body).doesNotContain("\"slug\":\"" + slug + "\"");
			mvc.perform(get(BLOGS + "/" + slug)).andExpect(status().isNotFound());
		}
		for (String slug : new String[] { "newest", "older" }) {
			assertThat(body).contains("\"slug\":\"" + slug + "\"");
			mvc.perform(get(BLOGS + "/" + slug)).andExpect(status().isOk());
		}
	}

	@Test
	void publicationChangesTakeEffectImmediately() throws Exception {
		String admin = adminToken();
		long draftId = id("draft");

		patchJson(draftId, "{\"status\":\"publish\"}", admin).andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/draft")).andExpect(status().isOk());
		mvc.perform(get(BLOGS)).andExpect(jsonPath("$.content[0].slug").value("draft"));

		patchJson(draftId, "{\"status\":\"draft\"}", admin).andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/draft")).andExpect(status().isNotFound());

		patchJson(id("newest"), "{\"publishedAt\":\"2099-01-01T00:00:00Z\"}", admin).andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/newest")).andExpect(status().isNotFound());
		patchJson(id("scheduled"), "{\"publishedAt\":\"2026-01-01T00:00:00Z\"}", admin).andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/scheduled")).andExpect(status().isOk());

		// A slug change moves the public URL; the old one is gone.
		patchJson(id("older"), "{\"slug\":\"older-renamed\"}", admin).andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/older")).andExpect(status().isNotFound());
		mvc.perform(get(BLOGS + "/older-renamed")).andExpect(status().isOk());

		mvc.perform(delete("/api/v1/admin/blogs/" + id("older-renamed")).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isNoContent());
		mvc.perform(get(BLOGS + "/older-renamed")).andExpect(status().isNotFound());

		// Deactivating a category hides its blogs.
		mvc.perform(patch("/api/v1/admin/blog-categories/1").contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"inactive\"}").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isOk());
		mvc.perform(get(BLOGS + "/scheduled")).andExpect(status().isNotFound());
		mvc.perform(get(BLOGS)).andExpect(jsonPath("$.content", empty()));
	}

	@Test
	void publicEndpointsAreReadOnly() throws Exception {
		mvc.perform(post(BLOGS).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(patch(BLOGS + "/newest").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(delete(BLOGS + "/newest")).andExpect(status().isUnauthorized());
		mvc.perform(multipart(BLOGS).param("title", "x").param("content", "x")).andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM blogs", Integer.class)).isEqualTo(8);
		assertThat(jdbc.queryForObject("SELECT title FROM blogs WHERE slug = 'newest'", String.class)).isEqualTo("newest");
	}

	@Test
	void featureImageOnlyForVisibleBlogs() throws Exception {
		String key = "blogs/0b5c7c1e-3a8d-4b8e-9f00-1234567890ab.png";
		storage.put(key, new ByteArrayInputStream(PNG));
		jdbc.update("UPDATE blogs SET feature_image = ? WHERE slug = 'draft'", key);
		String url = BLOGS + "/newest/feature-image/0b5c7c1e-3a8d-4b8e-9f00-1234567890ab.png";

		mvc.perform(get(url))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.IMAGE_PNG))
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=3600, public"))
			.andExpect(header().string("X-Content-Type-Options", "nosniff"));
		mvc.perform(get(BLOGS + "/draft/feature-image/0b5c7c1e-3a8d-4b8e-9f00-1234567890ab.png"))
			.andExpect(status().isNotFound());
		mvc.perform(get(BLOGS + "/newest/feature-image/other.png")).andExpect(status().isNotFound());
	}

	@Test
	void categoriesListsActiveOnesByTitleWithPublicFields() throws Exception {
		mvc.perform(get(CATEGORIES))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"))
			.andExpect(jsonPath("$.content[*].slug", contains("home-loans", "legal")))
			.andExpect(jsonPath("$.content[0].metaTitle").value("Home Loans"))
			.andExpect(jsonPath("$.content[0].metaDescription").value("Loan guides"))
			.andExpect(jsonPath("$.content[1].metaTitle").value("Legal guides"))
			.andExpect(jsonPath("$.content[0].status").doesNotExist())
			.andExpect(jsonPath("$.content[0].blogCount").doesNotExist())
			.andExpect(jsonPath("$.content[0].createdAt").doesNotExist());
	}

	@Test
	void categoryBlogsUseTheSameRules() throws Exception {
		mvc.perform(get(CATEGORIES + "/home-loans/blogs"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].slug", contains("newest")));
		mvc.perform(get(CATEGORIES + "/legal/blogs").param("status", "draft"))
			.andExpect(jsonPath("$.content[*].slug", contains("older")));
		for (String slug : new String[] { "archive", "gone", "no-such", "Bad Slug" }) {
			mvc.perform(get(CATEGORIES + "/" + slug + "/blogs"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("blog_category_not_found"));
		}
	}

	@Test
	void categoryImageOnlyForActiveCategories() throws Exception {
		String key = "blog-categories/1c2d3e4f-0000-4000-8000-000000000001.png";
		storage.put(key, new ByteArrayInputStream(PNG));
		jdbc.update("UPDATE blog_categories SET image = ? WHERE slug IN ('home-loans', 'archive')", key);

		mvc.perform(get(CATEGORIES))
			.andExpect(jsonPath("$.content[0].imageUrl")
				.value("/api/v1/public/blog-categories/home-loans/image/1c2d3e4f-0000-4000-8000-000000000001.png"));
		mvc.perform(get(CATEGORIES + "/home-loans/image/1c2d3e4f-0000-4000-8000-000000000001.png"))
			.andExpect(status().isOk())
			.andExpect(content().bytes(PNG));
		mvc.perform(get(CATEGORIES + "/archive/image/1c2d3e4f-0000-4000-8000-000000000001.png"))
			.andExpect(status().isNotFound());
	}

	@Test
	void adminFeatureImageUploadIsServedPublicly() throws Exception {
		String admin = adminToken();
		String url = json(mvc.perform(multipart("/api/v1/admin/blogs").file(new MockMultipartFile("featureImage", "f.png",
				"image/png", PNG)).param("title", "With image").param("content", "<p>x</p>").param("categoryId", "1")
				.param("status", "publish").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.featureImageUrl");
		String fileName = url.substring(url.lastIndexOf('/') + 1);

		mvc.perform(get(BLOGS + "/with-image"))
			.andExpect(jsonPath("$.featureImageUrl").value(BLOGS + "/with-image/feature-image/" + fileName));
		mvc.perform(get(BLOGS + "/with-image/feature-image/" + fileName)).andExpect(content().bytes(PNG));
	}

	// ---- Helpers ----

	private void blog(String slug, Long categoryId, String status, String publishedAtSql, String tags) {
		jdbc.update("INSERT INTO blogs (title, slug, category_id, content, status, published_at, tags) VALUES (?, ?, ?, ?, ?, "
				+ publishedAtSql + ", CAST(? AS JSONB))", slug, slug, categoryId, "<p>Body of " + slug + "</p>", status, tags);
	}

	private long id(String slug) {
		return jdbc.queryForObject("SELECT id FROM blogs WHERE slug = ?", Long.class, slug);
	}

	private String adminToken() throws Exception {
		jdbc.update("""
				INSERT INTO users (email, password_hash, full_name, status, user_type, email_verified)
				VALUES ('admin@example.com', ?, 'Admin', 'active', 'admin', now())""", passwordEncoder.encode(PASSWORD));
		return json(postJson("/api/v1/admin/login", "{\"identifier\":\"admin@example.com\",\"password\":\"%s\"}"
			.formatted(PASSWORD)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return mvc.perform(patch("/api/v1/admin/blogs/" + id).contentType(MediaType.APPLICATION_JSON).content(json)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

}
