package com.propertypro.property_platform.cms.banner;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin banner management through real admin logins, so every request goes through token validation
 * and the users.user_type = roles.slug permission lookup. Roles changed by a test are restored.
 */
class AdminBannerApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/admin/banners";
	private static final String ADMIN_EMAIL = "admin@example.com";
	private static final List<String> SEEDED_ROLES = List.of("super-admin", "admin", "user");
	private static final List<String> BANNER_ACTIONS = List.of("list", "view", "create", "update", "change_status",
			"delete");
	/** PNG signature plus padding: enough for content detection. */
	static final byte[] PNG = bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R');
	static final byte[] JPEG = bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1);
	private static final String IMAGE_URL = "^/api/v1/admin/banners/%d/image/[0-9a-f-]{36}\\.%s$";

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private MediaStorage storage;

	private List<Map<String, Object>> originalRoles;
	private String admin;

	@BeforeEach
	void setUp() throws Exception {
		jdbc.execute("TRUNCATE banners RESTART IDENTITY");
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
		void createsInactiveBannerWithServerSetFields() throws Exception {
			perform(createRequest(), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.title").value("Monsoon offer"))
				.andExpect(jsonPath("$.type").value("promotion"))
				.andExpect(jsonPath("$.placement").value("home_top"))
				.andExpect(jsonPath("$.linkType").value(nullValue()))
				.andExpect(jsonPath("$.link").value(nullValue()))
				.andExpect(jsonPath("$.imageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "png"))))
				.andExpect(jsonPath("$.status").value("inactive"))
				.andExpect(jsonPath("$.displayState").value("inactive"))
				.andExpect(jsonPath("$.startDate").value(nullValue()))
				.andExpect(jsonPath("$.createdAt").isNotEmpty())
				.andExpect(jsonPath("$.updatedAt").isNotEmpty())
				.andExpect(jsonPath("$.image").doesNotExist())
				.andExpect(jsonPath("$.deleteAt").doesNotExist());
			String key = column(1, "image");
			assertThat(key).matches("banners/[0-9a-f-]{36}\\.png");
			assertThat(storage.get(key).exists()).isTrue();
			assertThat(column(1, "delete_at")).isNull();
		}

		@Test
		void storesLinksScheduleAndActiveStatus() throws Exception {
			perform(createRequest("title", " Diwali sale ", "type", "offer", "placement", "property_list",
					"linkType", "external", "link", "https://shop.example.com/diwali", "status", "active",
					"startDate", "2026-11-01T00:00:00+05:30", "endDate", "2026-11-15T23:59:59Z"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.title").value("Diwali sale"))
				.andExpect(jsonPath("$.linkType").value("external"))
				.andExpect(jsonPath("$.link").value("https://shop.example.com/diwali"))
				.andExpect(jsonPath("$.status").value("active"))
				// Offsets are accepted; responses and storage are UTC.
				.andExpect(jsonPath("$.startDate").value("2026-10-31T18:30:00Z"))
				.andExpect(jsonPath("$.endDate").value("2026-11-15T23:59:59Z"));
		}

		@Test
		void acceptsInternalLinkAndEqualScheduleBounds() throws Exception {
			perform(createRequest("linkType", "internal", "link", "/offers/diwali", "startDate", "2026-11-01T00:00:00Z",
					"endDate", "2026-11-01T00:00:00Z"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.link").value("/offers/diwali"));
		}

		@Test
		void requiresTitleTypeAndPlacement() throws Exception {
			perform(multipart(BASE).file(png()), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("validation_failed"))
				.andExpect(jsonPath("$.errors.title").exists())
				.andExpect(jsonPath("$.errors.type").exists())
				.andExpect(jsonPath("$.errors.placement").exists());
			assertThat(bannerCount()).isZero();
		}

		@Test
		void requiresImage() throws Exception {
			perform(withFields(multipart(BASE), validFields()), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.image").value("must not be empty"));
			assertThat(bannerCount()).isZero();
		}

		@ParameterizedTest(name = "{0}={1} -> {2}")
		@CsvSource(delimiter = '|', value = {
				"type|popup|type",
				"placement|sidebar|placement",
				"status|archived|status",
				"status|true|status",
				"linkType|deep_link|linkType",
				"link|/offers|linkType",
				"linkType|external|link",
				"title|''|title",
				"startDate|tomorrow|startDate",
				"endDate|2026-13-01T00:00:00Z|endDate" })
		void rejectsInvalidField(String field, String value, String errorField) throws Exception {
			perform(createRequest(field, value), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + errorField).exists());
			assertThat(bannerCount()).isZero();
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"external|javascript:alert(1)",
				"external|data:text/html;base64,PHNjcmlwdD4=",
				"external|http://example.com",
				"external|https://user:secret@example.com",
				"internal|//evil.example.com",
				"internal|/offers/../admin",
				"internal|/admin/users",
				"internal|https://example.com" })
		void rejectsUnsafeLinks(String linkType, String link) throws Exception {
			perform(createRequest("linkType", linkType, "link", link), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.link").exists());
			assertThat(bannerCount()).isZero();
		}

		@Test
		void rejectsEndBeforeStart() throws Exception {
			perform(createRequest("startDate", "2026-11-10T00:00:00Z", "endDate", "2026-11-09T23:59:59Z"), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.endDate").value("must not be before startDate"));
		}

		@Test
		void rejectsFilesThatAreNotImages() throws Exception {
			MockMultipartFile text = new MockMultipartFile("image", "banner.png", "image/png", "<svg onload=alert(1)>".getBytes());
			MockMultipartFile pdf = new MockMultipartFile("image", "banner.pdf", "image/png", "%PDF-1.7 fake".getBytes());
			MockMultipartFile renamed = new MockMultipartFile("image", "banner.jpg", "image/jpeg", PNG);
			for (MockMultipartFile file : List.of(text, pdf, renamed)) {
				perform(withFields(multipart(BASE).file(file), validFields()), admin)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.errors.image").exists());
			}
			assertThat(bannerCount()).isZero();
		}

		@Test
		void rejectsOversizedImage() throws Exception {
			byte[] large = Arrays.copyOf(JPEG, 1024 * 1024 + 1);
			perform(withFields(multipart(BASE).file(new MockMultipartFile("image", "big.jpg", "image/jpeg", large)),
					validFields()), admin)
				.andExpect(status().isContentTooLarge())
				.andExpect(jsonPath("$.code").value("file_too_large"));
			assertThat(bannerCount()).isZero();
		}

		@Test
		void ignoresProtectedFields() throws Exception {
			perform(createRequest("id", "99", "createdAt", "2020-01-01T00:00:00Z", "updatedAt", "2020-01-01T00:00:00Z",
					"deleteAt", "2020-01-01T00:00:00Z", "image", "../../etc/passwd"), admin)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1));
			assertThat(column(1, "delete_at")).isNull();
			assertThat(column(1, "created_at")).startsWith("20").doesNotStartWith("2020");
			assertThat(column(1, "image")).startsWith("banners/");
		}

		@Test
		void activatingNeedsChangeStatusPermission() throws Exception {
			String editor = staff("editor", "create");

			perform(createRequest("status", "active"), editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("banner_status_change_forbidden"));
			assertThat(bannerCount()).isZero();

			perform(createRequest("status", "inactive"), editor).andExpect(status().isCreated());
		}

	}

	@Nested
	class Get {

		@Test
		void returnsBanner() throws Exception {
			createBanner();
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.imageUrl").value(matchesPattern(IMAGE_URL.formatted(1, "png"))));
		}

		@Test
		void returns404ForUnknownOrDeletedBanner() throws Exception {
			perform(get(BASE + "/1"), admin)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("banner_not_found"));
			createBanner();
			jdbc.update("UPDATE banners SET delete_at = now()");
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
		}

		@Test
		void rejectsNonNumericId() throws Exception {
			perform(get(BASE + "/abc"), admin).andExpect(status().isBadRequest());
			perform(get(BASE + "/1; DROP TABLE banners"), admin).andExpect(status().isBadRequest());
		}

		@Test
		void streamsImageOnlyUnderItsCurrentName() throws Exception {
			String imageUrl = json(createBanner(), "$.imageUrl");
			perform(get(imageUrl), admin)
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_PNG))
				.andExpect(content().bytes(PNG))
				.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
				.andExpect(header().string("X-Content-Type-Options", "nosniff"));
			perform(get(BASE + "/1/image/other.png"), admin).andExpect(status().isNotFound());
		}

	}

	@Nested
	class Update {

		@Test
		void changesOnlyGivenFields() throws Exception {
			createBanner("linkType", "internal", "link", "/offers", "startDate", "2026-11-01T00:00:00Z");
			String before = column(1, "updated_at");

			patchJson(1, "{\"title\":\"  New title \"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("New title"))
				.andExpect(jsonPath("$.type").value("promotion"))
				.andExpect(jsonPath("$.link").value("/offers"))
				.andExpect(jsonPath("$.startDate").value("2026-11-01T00:00:00Z"));
			assertThat(column(1, "updated_at")).isNotEqualTo(before);
		}

		@Test
		void explicitNullClearsLinkAndSchedule() throws Exception {
			createBanner("linkType", "internal", "link", "/offers", "startDate", "2026-11-01T00:00:00Z",
					"endDate", "2026-12-01T00:00:00Z");

			patchJson(1, "{\"linkType\":null,\"link\":null,\"startDate\":null,\"endDate\":null}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.linkType").value(nullValue()))
				.andExpect(jsonPath("$.link").value(nullValue()))
				.andExpect(jsonPath("$.startDate").value(nullValue()))
				.andExpect(jsonPath("$.endDate").value(nullValue()));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "title", "type", "placement", "status" })
		void explicitNullIsRejectedForRequiredFields(String field) throws Exception {
			createBanner();
			patchJson(1, "{\"" + field + "\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
		}

		@Test
		void validatesLinkPairWithSavedValues() throws Exception {
			createBanner("linkType", "internal", "link", "/offers");

			// The saved internal path is not a valid external link.
			patchJson(1, "{\"linkType\":\"external\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.link").exists());
			patchJson(1, "{\"linkType\":null}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.linkType").exists());
			patchJson(1, "{\"link\":\"javascript:alert(1)\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.link").exists());
			assertThat(column(1, "link")).isEqualTo("/offers");

			patchJson(1, "{\"linkType\":\"external\",\"link\":\"https://example.com/sale\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.linkType").value("external"));
		}

		@Test
		void validatesScheduleWithSavedValues() throws Exception {
			createBanner("startDate", "2026-11-10T00:00:00Z");

			patchJson(1, "{\"endDate\":\"2026-11-09T00:00:00Z\"}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.endDate").exists());
			patchJson(1, "{\"endDate\":\"not-a-date\"}", admin).andExpect(status().isBadRequest());
			assertThat(column(1, "end_date")).isNull();
		}

		@Test
		void validatesTypeAndPlacement() throws Exception {
			createBanner();
			patchJson(1, "{\"type\":\"popup\"}", admin).andExpect(jsonPath("$.errors.type").exists());
			patchJson(1, "{\"placement\":\"Home Top\"}", admin).andExpect(jsonPath("$.errors.placement").exists());
			patchJson(1, "{\"status\":\"published\"}", admin).andExpect(jsonPath("$.errors.status").exists());
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = { "id|5", "image|'\"../../etc/passwd\"'", "createdAt|'\"2020-01-01T00:00:00Z\"'",
				"updatedAt|'\"2020-01-01T00:00:00Z\"'", "deleteAt|'\"2020-01-01T00:00:00Z\"'", "displayState|'\"live\"'" })
		void rejectsProtectedAndUnknownFields(String field, String value) throws Exception {
			createBanner();
			String image = column(1, "image");
			patchJson(1, "{\"" + field + "\":" + value + "}", admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors." + field).exists());
			assertThat(column(1, "image")).isEqualTo(image);
			assertThat(column(1, "delete_at")).isNull();
		}

		@Test
		void changingStatusNeedsChangeStatusPermission() throws Exception {
			createBanner();
			String editor = staff("editor", "update");

			patchJson(1, "{\"status\":\"active\"}", editor)
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("banner_status_change_forbidden"));
			assertThat(column(1, "status")).isEqualTo("inactive");
			// Sending the current status is not a change.
			patchJson(1, "{\"status\":\"inactive\",\"title\":\"Edited\"}", editor).andExpect(status().isOk());

			patchJson(1, "{\"status\":\"active\"}", admin)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("active"))
				.andExpect(jsonPath("$.displayState").value("live"));
			patchJson(1, "{\"status\":\"inactive\"}", editor).andExpect(status().isForbidden());
		}

		@Test
		void returns404ForUnknownOrDeletedBanner() throws Exception {
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			createBanner();
			jdbc.update("UPDATE banners SET delete_at = now()");
			patchJson(1, "{\"title\":\"X\"}", admin).andExpect(status().isNotFound());
			assertThat(column(1, "title")).isEqualTo("Monsoon offer");
		}

		@Test
		void replacesImageAndDeletesTheOldFile() throws Exception {
			createBanner();
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
			createBanner();
			String key = column(1, "image");

			perform(multipart(HttpMethod.PUT, BASE + "/1/image")
					.file(new MockMultipartFile("image", "x.png", "image/png", "not an image".getBytes())), admin)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.image").exists());
			perform(multipart(HttpMethod.PUT, BASE + "/1/image"), admin).andExpect(status().isBadRequest());
			assertThat(column(1, "image")).isEqualTo(key);
			assertThat(storage.get(key).exists()).isTrue();
		}

	}

	@Nested
	class Delete {

		@Test
		void softDeletesAndKeepsTheImage() throws Exception {
			createBanner();
			String key = column(1, "image");

			perform(delete(BASE + "/1"), admin).andExpect(status().isNoContent());

			assertThat(column(1, "delete_at")).isNotNull();
			assertThat(storage.get(key).exists()).isTrue();
			perform(get(BASE + "/1"), admin).andExpect(status().isNotFound());
			perform(get(BASE), admin).andExpect(jsonPath("$.totalElements").value(0));
			perform(delete(BASE + "/1"), admin).andExpect(status().isNotFound());
			perform(delete(BASE + "/2"), admin).andExpect(status().isNotFound());
		}

	}

	@Nested
	class ListBanners {

		@BeforeEach
		void insertBanners() {
			insert("Monsoon offer", "promotion", "home_top", "active", "internal", "/offers", "2026-07-01T00:00:00Z",
					"2026-09-30T23:59:59Z", "2026-06-01T00:00:00Z");
			insert("Diwali 50% off", "offer", "property_list", "inactive", "external", "https://example.com",
					"2026-11-01T00:00:00Z", null, "2026-06-02T00:00:00Z");
			insert("App update", "announcement", "home_top", "active", null, null, null, "2026-12-31T00:00:00Z",
					"2026-06-03T00:00:00Z");
			insert("Deleted banner", "promotion", "home_top", "active", null, null, null, null, "2026-06-04T00:00:00Z");
			jdbc.update("UPDATE banners SET delete_at = now() WHERE title = 'Deleted banner'");
		}

		@Test
		void newestFirstWithPaginationMetadata() throws Exception {
			list("")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[*].title", contains("App update", "Diwali 50% off", "Monsoon offer")))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(20))
				.andExpect(jsonPath("$.totalElements").value(3))
				.andExpect(jsonPath("$.totalPages").value(1));
			list("?size=2&page=1")
				.andExpect(jsonPath("$.content[*].title", contains("Monsoon offer")))
				.andExpect(jsonPath("$.totalPages").value(2));
			list("?size=1000").andExpect(jsonPath("$.size").value(100));
		}

		@Test
		void filters() throws Exception {
			list("?search=OFF").andExpect(jsonPath("$.content[*].title", contains("Diwali 50% off", "Monsoon offer")));
			// LIKE wildcards in the search are literal characters.
			perform(get(BASE).param("search", "50%"), admin)
				.andExpect(jsonPath("$.content[*].title", contains("Diwali 50% off")));
			perform(get(BASE).param("search", "0%_o"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			perform(get(BASE).param("search", "_"), admin).andExpect(jsonPath("$.content", hasSize(0)));
			list("?status=inactive").andExpect(jsonPath("$.content[*].title", contains("Diwali 50% off")));
			list("?type=announcement").andExpect(jsonPath("$.content[*].title", contains("App update")));
			list("?placement=home_top").andExpect(jsonPath("$.content[*].title", contains("App update", "Monsoon offer")));
			list("?linkType=external").andExpect(jsonPath("$.content[*].title", contains("Diwali 50% off")));
			list("?startDateFrom=2026-08-01T00:00:00Z").andExpect(jsonPath("$.content[*].title", contains("Diwali 50% off")));
			list("?startDateTo=2026-07-01T00:00:00Z").andExpect(jsonPath("$.content[*].title", contains("Monsoon offer")));
			list("?endDateFrom=2026-10-01T00:00:00Z").andExpect(jsonPath("$.content[*].title", contains("App update")));
			list("?endDateTo=2026-09-30T23:59:59Z").andExpect(jsonPath("$.content[*].title", contains("Monsoon offer")));
			list("?status=active&placement=home_top&search=app")
				.andExpect(jsonPath("$.content[*].title", contains("App update")));
		}

		@Test
		void sortsByAllowedFields() throws Exception {
			list("?sort=title,asc")
				.andExpect(jsonPath("$.content[*].title", contains("App update", "Diwali 50% off", "Monsoon offer")));
			list("?sort=startDate,asc")
				.andExpect(jsonPath("$.content[*].title", contains("Monsoon offer", "Diwali 50% off", "App update")));
		}

		@ParameterizedTest
		@CsvSource(delimiter = '|', value = {
				"sort=image|sort",
				"sort=deleteAt|sort",
				"sort=title;DROP TABLE banners|sort",
				"sort=title,sideways|sort",
				"status=deleted|status",
				"linkType=deep|linkType",
				"type=Promo Banner|type",
				"startDateFrom=yesterday|startDateFrom",
				"startDateFrom=2026-08-01T00:00:00Z&startDateTo=2026-07-01T00:00:00Z|startDateTo",
				"endDateFrom=2026-08-01T00:00:00Z&endDateTo=2026-07-01T00:00:00Z|endDateTo" })
		void rejectsInvalidParameters(String query, String errorField) throws Exception {
			list("?" + query)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors['" + errorField + "']").exists());
		}

		private ResultActions list(String query) throws Exception {
			return perform(get(BASE + query.replace(" ", "%20")), admin);
		}

	}

	@Nested
	class Access {

		@Test
		void requiresAuthentication() throws Exception {
			createBanner();
			for (String endpoint : ENDPOINTS) {
				// With a valid CSRF token: without one, the CSRF check answers 403 before authentication.
				mvc.perform(withCsrf(endpoint(endpoint))).andExpect(status().isUnauthorized());
				mvc.perform(endpoint(endpoint).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
					.andExpect(status().isUnauthorized());
			}
			assertThat(bannerCount()).isEqualTo(1);
			assertThat(column(1, "delete_at")).isNull();
		}

		@Test
		void rejectsAppUsersWhateverTheyClaim() throws Exception {
			createBanner();
			registerActiveUser();
			String appUser = json(loginBody(EMAIL, PASSWORD), "$.accessToken");

			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), appUser).andExpect(status().isForbidden());
				// Client-supplied identity or permissions are ignored.
				perform(endpoint(endpoint).param("userId", "1").param("role", "admin").param("userType", "admin")
						.header("X-User-Id", "1").header("X-Role", "admin").header("X-Permissions", "BANNER_DELETE"),
						appUser)
					.andExpect(status().isForbidden());
			}
			assertThat(column(1, "title")).isEqualTo("Monsoon offer");
			assertThat(column(1, "delete_at")).isNull();
		}

		@Test
		void seededAdminRoleIsTheOnlyRoleWithBannerPermissions() throws Exception {
			assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'banner'", String.class))
				.containsExactly("admin");
			assertThat(jdbc.queryForObject("SELECT (permissions -> 'banner')::text FROM roles WHERE slug = 'admin'",
					String.class))
				.isEqualTo("{\"list\": true, \"view\": true, \"create\": true, \"delete\": true, \"update\": true, "
						+ "\"change_status\": true}");

			createBanner();
			for (String endpoint : ENDPOINTS) {
				perform(endpoint(endpoint), admin).andExpect(status().is2xxSuccessful());
			}
		}

		/** Every other banner permission is not enough; the endpoint's own permission is. */
		@ParameterizedTest(name = "{0} needs banner.{1}")
		@MethodSource("com.propertypro.property_platform.cms.banner.AdminBannerApiTests#endpointPermissions")
		void requiresEndpointPermission(String endpoint, String action, int successStatus) throws Exception {
			createBanner();
			String[] others = BANNER_ACTIONS.stream().filter(a -> !a.equals(action)).toArray(String[]::new);

			perform(endpoint(endpoint), staff("without", others)).andExpect(status().isForbidden());
			assertThat(bannerCount()).isEqualTo(1);
			assertThat(column(1, "title")).isEqualTo("Monsoon offer");
			assertThat(column(1, "delete_at")).isNull();

			perform(endpoint(endpoint), staff("only", action)).andExpect(status().is(successStatus));
		}

		@Test
		void roleChangesApplyOnTheNextRequest() throws Exception {
			createBanner();
			String staff = staff("editor", BANNER_ACTIONS.toArray(String[]::new));
			perform(get(BASE), staff).andExpect(status().isOk());

			// Permission revoked.
			jdbc.update("UPDATE roles SET permissions = permissions #- '{banner,list}' WHERE slug = 'editor'");
			perform(get(BASE), staff).andExpect(status().isForbidden());
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			// Role disabled, then deleted.
			jdbc.update("UPDATE roles SET status = 'inactive' WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
			jdbc.update("UPDATE roles SET status = 'active', deleted_at = now() WHERE slug = 'editor'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void userTypeWithoutMatchingRoleIsDenied() throws Exception {
			createBanner();
			String staff = staff("editor", BANNER_ACTIONS.toArray(String[]::new));
			perform(get(BASE + "/1"), staff).andExpect(status().isOk());

			jdbc.update("UPDATE users SET user_type = 'no-such-role' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());

			// A matching slug alone is not enough: the role must grant the permission.
			jdbc.update("UPDATE users SET user_type = 'user' WHERE email = 'editor@example.com'");
			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

		@Test
		void adminPanelAccessIsRequired() throws Exception {
			createBanner();
			String staff = staff("editor", BANNER_ACTIONS.toArray(String[]::new));
			jdbc.update("UPDATE roles SET permissions = permissions - 'admin_panel' WHERE slug = 'editor'");

			perform(get(BASE + "/1"), staff).andExpect(status().isForbidden());
		}

	}

	// ---- Endpoints ----

	/** Delete last, so looping over them leaves banner 1 in place for the others. */
	private static final List<String> ENDPOINTS = List.of("list", "view", "create", "update", "image", "download",
			"delete");

	static Stream<Arguments> endpointPermissions() {
		return Stream.of(
				Arguments.of("list", "list", 200),
				Arguments.of("view", "view", 200),
				Arguments.of("create", "create", 201),
				Arguments.of("update", "update", 200),
				Arguments.of("image", "update", 200),
				Arguments.of("delete", "delete", 204),
				Arguments.of("download", "view", 200));
	}

	/** A new request for one endpoint, on banner 1. */
	private AbstractMockHttpServletRequestBuilder<?> endpoint(String name) {
		return switch (name) {
			case "list" -> get(BASE);
			case "view" -> get(BASE + "/1");
			case "create" -> createRequest();
			case "update" -> patch(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Changed\"}");
			case "image" -> multipart(HttpMethod.PUT, BASE + "/1/image").file(png());
			case "delete" -> delete(BASE + "/1");
			case "download" -> get(BASE + "/1/image/" + column(1, "substring(image from 9)"));
			default -> throw new IllegalArgumentException(name);
		};
	}

	// ---- Helpers ----

	private static String[] validFields() {
		return new String[] { "title", "Monsoon offer", "type", "promotion", "placement", "home_top" };
	}

	/** Valid create request with a PNG image; {@code overrides} are name/value pairs replacing or adding fields. */
	private MockMultipartHttpServletRequestBuilder createRequest(String... overrides) {
		Map<String, String> fields = new LinkedHashMap<>();
		String[] defaults = validFields();
		for (int i = 0; i < defaults.length; i += 2) {
			fields.put(defaults[i], defaults[i + 1]);
		}
		for (int i = 0; i < overrides.length; i += 2) {
			fields.put(overrides[i], overrides[i + 1]);
		}
		MockMultipartHttpServletRequestBuilder request = multipart(BASE).file(png());
		fields.forEach(request::param);
		return request;
	}

	private static MockMultipartHttpServletRequestBuilder withFields(MockMultipartHttpServletRequestBuilder request,
			String... fields) {
		for (int i = 0; i < fields.length; i += 2) {
			request.param(fields[i], fields[i + 1]);
		}
		return request;
	}

	private String createBanner(String... overrides) throws Exception {
		return perform(createRequest(overrides), admin).andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
	}

	private static MockMultipartFile png() {
		return new MockMultipartFile("image", "banner.png", "image/png", PNG);
	}

	private ResultActions perform(AbstractMockHttpServletRequestBuilder<?> request, String token) throws Exception {
		return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions patchJson(long id, String json, String token) throws Exception {
		return perform(patch(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json), token);
	}

	/** Logs in a staff member whose new role grants admin panel access plus the given banner actions. */
	private String staff(String slug, String... bannerActions) throws Exception {
		String actions = Arrays.stream(bannerActions).map(a -> "\"" + a + "\": true")
			.reduce((a, b) -> a + ", " + b).orElse("");
		jdbc.update("INSERT INTO roles (name, slug, permissions) VALUES (?, ?, ?::jsonb)", slug, slug,
				"{\"admin_panel\": {\"access\": true}, \"banner\": {" + actions + "}}");
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

	private void insert(String title, String type, String placement, String status, String linkType, String link,
			String startDate, String endDate, String createdAt) {
		jdbc.update("""
				INSERT INTO banners (title, type, placement, status, link_type, link, image, start_date, end_date,
				    created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, 'banners/test.png', CAST(? AS TIMESTAMPTZ), CAST(? AS TIMESTAMPTZ),
				    CAST(? AS TIMESTAMPTZ), CAST(? AS TIMESTAMPTZ))""",
				title, type, placement, status, linkType, link, startDate, endDate, createdAt, createdAt);
	}

	private int bannerCount() {
		return jdbc.queryForObject("SELECT count(*) FROM banners", Integer.class);
	}

	/** One column (or expression) of a banner, as text; null when SQL NULL. */
	private String column(long id, String expression) {
		return jdbc.queryForObject("SELECT (" + expression + ")::text FROM banners WHERE id = ?", String.class, id);
	}

	private static byte[] bytes(int... values) {
		byte[] result = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			result[i] = (byte) values[i];
		}
		return result;
	}

}
