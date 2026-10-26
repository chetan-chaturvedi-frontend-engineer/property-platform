package com.propertypro.property_platform.cms.banner.repository;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class BannerSchemaTests {

	private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MICROS);
	private static final Duration DAY = Duration.ofDays(1);

	@Autowired
	private BannerRepository bannerRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	/** API tests commit banners; this delete is rolled back with the test. */
	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM banners");
	}

	@Test
	void defaultsToInactiveWithTimestamps() {
		Banner saved = bannerRepository.saveAndFlush(banner("home_top"));

		assertThat(saved.getStatus()).isEqualTo(BannerStatus.INACTIVE);
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(saved.getUpdatedAt()).isNotNull();
		assertThat(jdbc.queryForObject("SELECT status FROM banners WHERE id = ?", String.class, saved.getId()))
			.isEqualTo("inactive");
		assertThat(jdbc.queryForObject("INSERT INTO banners (title, type, placement, image) "
				+ "VALUES ('Raw', 'promo', 'home_top', 'banners/raw.webp') RETURNING status", String.class))
			.isEqualTo("inactive");
	}

	@Test
	void findDisplayableAppliesStatusScheduleAndSoftDelete() {
		Banner open = save("home_top", BannerStatus.ACTIVE, null, null);
		Banner running = save("home_top", BannerStatus.ACTIVE, NOW.minus(DAY), NOW.plus(DAY));
		Banner startsNow = save("home_top", BannerStatus.ACTIVE, NOW, null);
		Banner endsNow = save("home_top", BannerStatus.ACTIVE, null, NOW);
		save("home_top", BannerStatus.ACTIVE, NOW.plus(DAY), null);
		save("home_top", BannerStatus.ACTIVE, null, NOW.minus(DAY));
		save("home_top", BannerStatus.INACTIVE, null, null);
		save("search_results", BannerStatus.ACTIVE, null, null);
		Banner deleted = save("home_top", BannerStatus.ACTIVE, null, null);
		bannerRepository.delete(deleted);
		entityManager.flush();
		entityManager.clear();

		assertThat(bannerRepository.findDisplayable("home_top", NOW, PageRequest.of(0, 20)))
			.extracting(Banner::getId)
			.containsExactly(endsNow.getId(), startsNow.getId(), running.getId(), open.getId());
		assertThat(jdbc.queryForObject("SELECT delete_at IS NOT NULL FROM banners WHERE id = ?", Boolean.class,
				deleted.getId())).isTrue();
		assertThat(bannerRepository.findById(deleted.getId())).isEmpty();
	}

	@Test
	void isDisplayableAtMatchesInclusiveBounds() {
		Banner banner = banner("home_top");
		banner.setStatus(BannerStatus.ACTIVE);
		banner.reschedule(NOW, NOW.plus(DAY));

		assertThat(banner.isDisplayableAt(NOW)).isTrue();
		assertThat(banner.isDisplayableAt(NOW.plus(DAY))).isTrue();
		assertThat(banner.isDisplayableAt(NOW.minusMillis(1))).isFalse();
		assertThat(banner.isDisplayableAt(NOW.plus(DAY).plusMillis(1))).isFalse();
	}

	@Test
	void acceptsValidLinks() {
		Banner internal = banner("home_top");
		internal.changeLink(BannerLinkType.INTERNAL, "/properties/42?ref=banner");
		Banner external = banner("home_top");
		external.changeLink(BannerLinkType.EXTERNAL, "https://example.com/offer");
		Banner root = banner("home_top");
		root.changeLink(BannerLinkType.INTERNAL, "/");

		bannerRepository.saveAllAndFlush(List.of(internal, external, root));
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"link_type = 'other', link = '/x'",
			"link_type = 'internal', link = NULL",
			"link_type = NULL, link = '/x'",
			"link_type = 'internal', link = 'https://example.com'",
			"link_type = 'internal', link = '//evil.example.com'",
			"link_type = 'external', link = 'http://example.com'",
			"link_type = 'external', link = 'javascript:alert(1)'",
			"status = 'archived'",
			"type = 'Promo Banner'",
			"placement = ''",
			"title = '  '",
			"image = '/absolute/key.png'",
			"image = 'banners/../secret'",
			"image = 'https://cdn.example.com/x.png'",
			"start_date = now(), end_date = now() - interval '1 day'"
	})
	void rejectsInvalidRows(String assignment) {
		Long id = bannerRepository.saveAndFlush(banner("home_top")).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE banners SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rollbackDropsOnlyBannersAndMigrationReapplies() {
		bannerRepository.saveAndFlush(banner("home_top"));
		int roles = jdbc.queryForObject("SELECT count(*) FROM roles", Integer.class);

		jdbc.execute(script("db/rollback/U202610251700__create_banners.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('banners') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610251700'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM roles", Integer.class)).isEqualTo(roles);

		jdbc.execute(script("db/migration/V202610251700__create_banners.sql"));

		assertThat(jdbc.queryForObject("SELECT count(*) FROM banners", Integer.class)).isZero();
	}

	private Banner save(String placement, BannerStatus status, Instant start, Instant end) {
		Banner banner = banner(placement);
		banner.setStatus(status);
		banner.reschedule(start, end);
		return bannerRepository.saveAndFlush(banner);
	}

	private static Banner banner(String placement) {
		return new Banner("Monsoon offer", "promo", placement, "banners/2026/10/monsoon.webp");
	}

	private static String script(String path) {
		try {
			return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
		}
		catch (IOException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
