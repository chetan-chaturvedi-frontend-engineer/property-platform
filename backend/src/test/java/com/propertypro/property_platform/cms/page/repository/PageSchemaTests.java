package com.propertypro.property_platform.cms.page.repository;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PageSchemaTests {

	@Autowired
	private PageRepository pageRepository;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM pages");
	}

	@Test
	void defaultsToStaticDraftWithOptionalFieldsEmpty() {
		Page saved = pageRepository.saveAndFlush(new Page("About us", "about-us"));

		assertThat(saved.getType()).isEqualTo(PageType.STATIC);
		assertThat(saved.getStatus()).isEqualTo(PageStatus.DRAFT);
		assertThat(saved.getContent()).isEmpty();
		assertThat(saved.getSubHeading()).isNull();
		assertThat(saved.getMetaTitle()).isNull();
		assertThat(saved.getMetaDescription()).isNull();
		assertThat(saved.getMetaKeywords()).isNull();
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(saved.getUpdatedAt()).isNotNull();
		assertThat(jdbc.queryForMap("INSERT INTO pages (heading, slug, content) "
				+ "VALUES ('Terms', 'terms-and-conditions', '') RETURNING type, status"))
			.containsEntry("type", "static")
			.containsEntry("status", "draft");
	}

	@Test
	void storesSystemPublishedPagesWithSeoFields() {
		Page page = new Page("Privacy policy", "privacy-policy");
		page.setSubHeading("How we use your data");
		page.setContent("<p>Policy</p>");
		page.setType(PageType.SYSTEM);
		page.setStatus(PageStatus.PUBLISH);
		page.setMetaTitle("Privacy policy");
		page.setMetaDescription("What we collect and why.");
		page.setMetaKeywords("privacy, data protection");
		Long id = pageRepository.saveAndFlush(page).getId();

		assertThat(jdbc.queryForMap("SELECT type, status, meta_keywords FROM pages WHERE id = ?", id))
			.containsEntry("type", "system")
			.containsEntry("status", "publish")
			.containsEntry("meta_keywords", "privacy, data protection");
	}

	@Test
	void slugIsUniqueAndUpdateCheckIgnoresTheCurrentPage() {
		Page about = pageRepository.saveAndFlush(new Page("About us", "about-us"));
		Page terms = pageRepository.saveAndFlush(new Page("Terms", "terms"));

		assertThat(pageRepository.existsBySlug("about-us")).isTrue();
		assertThat(pageRepository.existsBySlugAndIdNot("about-us", about.getId())).isFalse();
		assertThat(pageRepository.existsBySlugAndIdNot("about-us", terms.getId())).isTrue();
		assertThat(pageRepository.findBySlug("terms")).get().extracting(Page::getId).isEqualTo(terms.getId());
		assertThatThrownBy(() -> jdbc.update("UPDATE pages SET slug = 'about-us' WHERE id = ?", terms.getId()))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"type = 'dynamic'",
			"type = NULL",
			"status = 'published'",
			"status = NULL",
			"heading = '  '",
			"heading = NULL",
			"slug = 'About Us'",
			"slug = 'about--us'",
			"slug = '-about'",
			"slug = NULL",
			"content = NULL"
	})
	void rejectsInvalidRows(String assignment) {
		Long id = pageRepository.saveAndFlush(new Page("About us", "about-us")).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE pages SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void createsTheFilterIndexes() {
		assertThat(jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = 'pages'", String.class))
			.containsExactlyInAnyOrder("pages_pkey", "uq_pages_slug", "idx_pages_status_type", "idx_pages_type");
	}

	@Test
	void rollbackDropsOnlyPagesAndMigrationReapplies() {
		pageRepository.saveAndFlush(new Page("About us", "about-us"));
		int faqs = jdbc.queryForObject("SELECT count(*) FROM faqs", Integer.class);

		jdbc.execute(script("db/rollback/U202610261200__create_pages.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('pages') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610261200'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM faqs", Integer.class)).isEqualTo(faqs);

		jdbc.execute(script("db/migration/V202610261200__create_pages.sql"));

		assertThat(jdbc.queryForObject("SELECT count(*) FROM pages", Integer.class)).isZero();
	}

	@Test
	void permissionGrantRollbackRemovesOnlyThePageModuleAndReapplies() {
		String others = "SELECT (permissions - 'page')::text FROM roles WHERE slug = 'admin'";
		String before = jdbc.queryForObject(others, String.class);

		jdbc.execute(script("db/rollback/U202610261300__grant_page_permissions.sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'page'", String.class)).isEmpty();
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610261300'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610261300__grant_page_permissions.sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'page'", String.class))
			.containsExactly("admin");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
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
