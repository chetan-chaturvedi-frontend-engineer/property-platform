package com.propertypro.property_platform.cms.faq.repository;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class FaqSchemaTests {

	private static final List<String> CONFIGURED = List.of("general", "billing");

	@Autowired
	private FaqRepository faqRepository;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM faqs");
	}

	@Test
	void defaultsToDraftAndZeroOrderWithTimestamps() {
		Faq saved = faqRepository.saveAndFlush(faq("general"));

		assertThat(saved.getStatus()).isEqualTo(FaqStatus.DRAFT);
		assertThat(saved.getSortOrder()).isZero();
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(saved.getUpdatedAt()).isNotNull();
		assertThat(jdbc.queryForObject("SELECT status FROM faqs WHERE id = ?", String.class, saved.getId()))
			.isEqualTo("draft");
		assertThat(jdbc.queryForMap("INSERT INTO faqs (question, answer, category) "
				+ "VALUES ('Q?', 'A.', 'general') RETURNING status, sort_order"))
			.containsEntry("status", "draft")
			.containsEntry("sort_order", 0);
	}

	@Test
	void publicQueryReturnsOnlyPublishedFaqsOfConfiguredCategoriesInDisplayOrder() {
		Faq second = save("general", FaqStatus.PUBLISH, 2);
		Faq firstTieA = save("billing", FaqStatus.PUBLISH, 1);
		Faq firstTieB = save("general", FaqStatus.PUBLISH, 1);
		save("general", FaqStatus.DRAFT, 0);
		save("removed_category", FaqStatus.PUBLISH, 0);

		assertThat(faqRepository.findAll(PublicFaqs.visible(CONFIGURED, null), PublicFaqs.ORDER))
			.extracting(Faq::getId)
			.containsExactly(firstTieA.getId(), firstTieB.getId(), second.getId());
		assertThat(faqRepository.findAll(PublicFaqs.visible(CONFIGURED, "general"), PublicFaqs.ORDER))
			.extracting(Faq::getId)
			.containsExactly(firstTieB.getId(), second.getId());
		assertThat(faqRepository.findAll(PublicFaqs.visible(CONFIGURED, "removed_category"))).isEmpty();
	}

	@Test
	void keepsFaqsOfUnconfiguredCategoriesReadable() {
		Faq orphan = save("removed_category", FaqStatus.PUBLISH, 0);

		assertThat(faqRepository.findById(orphan.getId())).get()
			.extracting(Faq::getCategory).isEqualTo("removed_category");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"status = 'published'",
			"status = NULL",
			"question = '  '",
			"answer = ''",
			"category = 'Billing Help'",
			"category = ''",
			"sort_order = NULL"
	})
	void rejectsInvalidRows(String assignment) {
		Long id = faqRepository.saveAndFlush(faq("general")).getId();

		assertThatThrownBy(() -> jdbc.update("UPDATE faqs SET " + assignment + " WHERE id = ?", id))
			.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rollbackDropsOnlyFaqsAndMigrationReapplies() {
		faqRepository.saveAndFlush(faq("general"));
		int banners = jdbc.queryForObject("SELECT count(*) FROM banners", Integer.class);

		jdbc.execute(script("db/rollback/U202610261000__create_faqs.sql"));

		assertThat(jdbc.queryForObject("SELECT to_regclass('faqs') IS NULL", Boolean.class)).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610261000'",
				Integer.class)).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM banners", Integer.class)).isEqualTo(banners);

		jdbc.execute(script("db/migration/V202610261000__create_faqs.sql"));

		assertThat(jdbc.queryForObject("SELECT count(*) FROM faqs", Integer.class)).isZero();
	}

	@Test
	void permissionGrantRollbackRemovesOnlyTheFaqModuleAndReapplies() {
		String others = "SELECT (permissions - 'faq')::text FROM roles WHERE slug = 'admin'";
		String before = jdbc.queryForObject(others, String.class);

		jdbc.execute(script("db/rollback/U202610261100__grant_faq_permissions.sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'faq'", String.class)).isEmpty();
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610261100'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V202610261100__grant_faq_permissions.sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'faq'", String.class))
			.containsExactly("admin");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
	}

	private Faq save(String category, FaqStatus status, int sortOrder) {
		Faq faq = faq(category);
		faq.setStatus(status);
		faq.setSortOrder(sortOrder);
		return faqRepository.saveAndFlush(faq);
	}

	private static Faq faq(String category) {
		return new Faq("How do I list a property?", "Open the app and tap Post property.", category);
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
