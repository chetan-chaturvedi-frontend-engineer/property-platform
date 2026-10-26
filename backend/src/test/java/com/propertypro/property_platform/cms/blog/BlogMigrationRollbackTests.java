package com.propertypro.property_platform.cms.blog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs the manual rollback scripts and then the migrations again. PostgreSQL DDL is transactional,
 * so the test transaction's rollback restores the schema and Flyway history afterwards.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class BlogMigrationRollbackTests {

	private static final String CATEGORIES = "202610251800__create_blog_categories";
	private static final String BLOGS = "202610251810__create_blogs";
	private static final String PERMISSIONS = "202610251900__grant_blog_category_permissions";
	private static final String BLOG_PERMISSIONS = "202610252000__grant_blog_permissions";
	private static final String INDEXES = "202610252010__index_blogs_admin_filters";

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void rollbackRemovesOnlyBlogTablesAndMigrationsReapply() {
		jdbc.execute(script("db/rollback/U" + BLOGS + ".sql"));
		assertThat(exists("blogs")).isFalse();
		assertThat(exists("blog_categories")).isTrue();

		jdbc.execute(script("db/rollback/U" + CATEGORIES + ".sql"));
		assertThat(exists("blog_categories")).isFalse();
		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM flyway_schema_history WHERE version IN ('202610251800', '202610251810')",
				Integer.class)).isZero();
		assertThat(exists("banners")).isTrue();

		jdbc.execute(script("db/migration/V" + CATEGORIES + ".sql"));
		jdbc.execute(script("db/migration/V" + BLOGS + ".sql"));

		Long categoryId = jdbc.queryForObject(
				"INSERT INTO blog_categories (title, slug) VALUES ('News', 'news') RETURNING id", Long.class);
		jdbc.update("INSERT INTO blogs (title, slug, category_id) VALUES ('Post', 'post', ?)", categoryId);
	}

	@Test
	void permissionGrantRollbackRemovesOnlyTheBlogCategoryModuleAndReapplies() {
		String others = "SELECT (permissions - 'blog_category')::text FROM roles WHERE slug = 'admin'";
		String before = jdbc.queryForObject(others, String.class);

		jdbc.execute(script("db/rollback/U" + PERMISSIONS + ".sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog_category'", String.class)).isEmpty();
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610251900'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V" + PERMISSIONS + ".sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog_category'", String.class))
			.containsExactly("admin");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
	}

	@Test
	void blogPermissionGrantRollbackRemovesOnlyTheBlogModuleAndReapplies() {
		String others = "SELECT (permissions - 'blog')::text FROM roles WHERE slug = 'admin'";
		String before = jdbc.queryForObject(others, String.class);

		jdbc.execute(script("db/rollback/U" + BLOG_PERMISSIONS + ".sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog'", String.class)).isEmpty();
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610252000'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V" + BLOG_PERMISSIONS + ".sql"));
		assertThat(jdbc.queryForList("SELECT slug FROM roles WHERE permissions ? 'blog'", String.class))
			.containsExactly("admin");
		assertThat(jdbc.queryForObject(others, String.class)).isEqualTo(before);
	}

	@Test
	void indexRollbackDropsOnlyItsIndexesAndReapplies() {
		jdbc.execute(script("db/rollback/U" + INDEXES + ".sql"));
		assertThat(exists("idx_blogs_created_at")).isFalse();
		assertThat(exists("idx_blogs_published_at")).isFalse();
		assertThat(exists("idx_blogs_public_published_at")).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '202610252010'",
				Integer.class)).isZero();

		jdbc.execute(script("db/migration/V" + INDEXES + ".sql"));
		assertThat(exists("idx_blogs_created_at")).isTrue();
		assertThat(exists("idx_blogs_published_at")).isTrue();
	}

	@Test
	void rollingBackCategoriesBeforeBlogsFailsInsteadOfDroppingDependents() {
		assertThatThrownBy(() -> jdbc.execute(script("db/rollback/U" + CATEGORIES + ".sql")))
				.isInstanceOf(DataAccessException.class)
				.hasMessageContaining("depend");
	}

	private boolean exists(String table) {
		return Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, table));
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
