package com.propertypro.property_platform.cms.banner;

import com.propertypro.property_platform.media.storage.MediaStorage;
import com.propertypro.property_platform.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The public (mobile app and website) banner list, against a fixed server clock. */
class PublicBannerApiTests extends AbstractIntegrationTest {

	private static final String BASE = "/api/v1/public/banners";
	private static final Instant NOW = Instant.parse("2026-10-25T12:00:00Z");
	private static final Duration DAY = Duration.ofDays(1);
	private static final Duration MICRO = Duration.ofNanos(1000);

	@Autowired
	private MutableClock clock;

	@Autowired
	private MediaStorage storage;

	@BeforeEach
	void reset() {
		jdbc.execute("TRUNCATE banners RESTART IDENTITY");
		clock.set(NOW);
	}

	@Test
	void returnsOnlyLiveBanners() throws Exception {
		insert("open", "home_top", "active", null, null);
		insert("running", "home_top", "active", NOW.minus(DAY), NOW.plus(DAY));
		insert("no end", "home_top", "active", NOW.minus(DAY), null);
		insert("no start", "home_top", "active", null, NOW.plus(DAY));
		insert("inactive", "home_top", "inactive", null, null);
		insert("future", "home_top", "active", NOW.plus(DAY), null);
		insert("expired", "home_top", "active", null, NOW.minus(DAY));
		long deleted = insert("deleted", "home_top", "active", null, null);
		jdbc.update("UPDATE banners SET delete_at = now() WHERE id = ?", deleted);

		list("")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].title", containsInAnyOrder("open", "running", "no end", "no start")))
			.andExpect(jsonPath("$.totalElements").value(4));
	}

	@Test
	void scheduleBoundsAreInclusive() throws Exception {
		insert("starts now", "home_top", "active", NOW, null);
		insert("ends now", "home_top", "active", null, NOW);
		insert("starts and ends now", "home_top", "active", NOW, NOW);
		insert("starts a microsecond later", "home_top", "active", NOW.plus(MICRO), null);
		insert("ended a microsecond ago", "home_top", "active", null, NOW.minus(MICRO));

		list("").andExpect(jsonPath("$.content[*].title",
				containsInAnyOrder("starts now", "ends now", "starts and ends now")));

		clock.set(NOW.plus(MICRO));
		list("").andExpect(jsonPath("$.content[*].title", contains("starts a microsecond later", "starts now")));
	}

	@Test
	void followsTheServerClock() throws Exception {
		insert("next week", "home_top", "active", NOW.plus(Duration.ofDays(7)), NOW.plus(Duration.ofDays(8)));
		list("").andExpect(jsonPath("$.content", empty()));

		clock.set(NOW.plus(Duration.ofDays(7)).plusSeconds(1));
		list("").andExpect(jsonPath("$.content[*].title", contains("next week")));

		clock.set(NOW.plus(Duration.ofDays(9)));
		list("").andExpect(jsonPath("$.content", empty()));
	}

	@Test
	void emptyResultIsAValidPage() throws Exception {
		list("")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content", empty()))
			.andExpect(jsonPath("$.totalElements").value(0));
	}

	@Test
	void filtersByPlacementAndOrdersStably() throws Exception {
		insert("top old", "home_top", "active", null, null);
		insert("list", "property_list", "active", null, null);
		insert("top new", "home_top", "active", null, null);
		jdbc.update("UPDATE banners SET created_at = created_at - interval '1 day' WHERE title = 'top old'");

		list("?placement=home_top").andExpect(jsonPath("$.content[*].title", contains("top new", "top old")));
		// Placement first, then newest first.
		list("").andExpect(jsonPath("$.content[*].title", contains("top new", "top old", "list")));
		list("?size=1&page=1")
			.andExpect(jsonPath("$.content[*].title", contains("top old")))
			.andExpect(jsonPath("$.totalPages").value(3));
	}

	@Test
	void rejectsUnknownPlacement() throws Exception {
		list("?placement=sidebar")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.placement").exists());
	}

	@Test
	void parametersCannotBypassEligibility() throws Exception {
		insert("live", "home_top", "active", null, null);
		insert("inactive", "home_top", "inactive", null, null);
		insert("future", "home_top", "active", NOW.plus(DAY), null);
		long deleted = insert("deleted", "home_top", "active", null, null);
		jdbc.update("UPDATE banners SET delete_at = now() WHERE id = ?", deleted);

		list("?status=inactive&status=active&includeDeleted=true&deleteAt=&withDeleted=1&startDate=2030-01-01T00:00:00Z"
				+ "&now=2030-01-01T00:00:00Z&sort=status,desc&sort=deleteAt&id=3")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content[*].title", contains("live")));
	}

	@Test
	void exposesOnlyDisplayFields() throws Exception {
		long id = insert("live", "home_top", "active", null, NOW.plus(DAY));
		jdbc.update("UPDATE banners SET link_type = 'internal', link = '/offers' WHERE id = ?", id);

		String body = list("")
			.andExpect(jsonPath("$.content[0].id").value(id))
			.andExpect(jsonPath("$.content[0].type").value("promotion"))
			.andExpect(jsonPath("$.content[0].placement").value("home_top"))
			.andExpect(jsonPath("$.content[0].linkType").value("internal"))
			.andExpect(jsonPath("$.content[0].link").value("/offers"))
			.andExpect(jsonPath("$.content[0].imageUrl", startsWith("/api/v1/public/banners/" + id + "/image/")))
			.andExpect(jsonPath("$.content[0].endDate").value(NOW.plus(DAY).toString()))
			.andReturn().getResponse().getContentAsString();
		for (String hidden : new String[] { "status", "deleteAt", "delete_at", "createdAt", "updatedAt", "displayState",
				"\"image\"", "banners/" + imageName(id) }) {
			assertThat(body).doesNotContain(hidden);
		}
	}

	@Test
	void listIsCachedBriefly() throws Exception {
		list("").andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"));
	}

	@Test
	void imageIsServedOnlyForLiveBanners() throws Exception {
		long live = insertWithImage("live", "active", null);
		long inactive = insertWithImage("inactive", "inactive", null);
		long expired = insertWithImage("expired", "active", NOW.minus(DAY));
		long deleted = insertWithImage("deleted", "active", null);
		jdbc.update("UPDATE banners SET delete_at = now() WHERE id = ?", deleted);

		mvc.perform(get(imageUrl(live)))
			.andExpect(status().isOk())
			.andExpect(content().contentType(MediaType.IMAGE_PNG))
			.andExpect(content().bytes(AdminBannerApiTests.PNG))
			.andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=3600, public"));
		for (long hidden : new long[] { inactive, expired, deleted }) {
			mvc.perform(get(imageUrl(hidden))).andExpect(status().isNotFound());
		}
		mvc.perform(get(BASE + "/" + live + "/image/" + UUID.randomUUID() + ".png")).andExpect(status().isNotFound());
		mvc.perform(get(BASE + "/" + live + "/image/..%2F..%2Fapplication.yml")).andExpect(status().is4xxClientError());
	}

	@Test
	void doesNotExposeManagement() throws Exception {
		mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/admin/banners")).andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM banners", Integer.class)).isZero();
	}

	private ResultActions list(String query) throws Exception {
		return mvc.perform(get(BASE + query));
	}

	private long insert(String title, String placement, String status, Instant startDate, Instant endDate) {
		return jdbc.queryForObject("""
				INSERT INTO banners (title, type, placement, status, image, start_date, end_date)
				VALUES (?, 'promotion', ?, ?, ?, ?, ?) RETURNING id""", Long.class,
				title, placement, status, "banners/" + UUID.randomUUID() + ".png", utc(startDate), utc(endDate));
	}

	/** A banner whose image file exists in storage. */
	private long insertWithImage(String title, String status, Instant endDate) throws Exception {
		long id = insert(title, "home_top", status, null, endDate);
		storage.put("banners/" + imageName(id), new ByteArrayInputStream(AdminBannerApiTests.PNG));
		return id;
	}

	private String imageName(long id) {
		return jdbc.queryForObject("SELECT substring(image from 9) FROM banners WHERE id = ?", String.class, id);
	}

	private String imageUrl(long id) {
		return BASE + "/" + id + "/image/" + imageName(id);
	}

	private static OffsetDateTime utc(Instant instant) {
		return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
	}

	/** Replaces the application clock for this test class only. */
	@TestConfiguration
	static class ClockConfig {

		@Bean
		@Primary
		MutableClock mutableClock() {
			return new MutableClock();
		}

	}

	static class MutableClock extends Clock {

		private volatile Instant now = Instant.now();

		void set(Instant instant) {
			now = instant;
		}

		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

	}

}
