package com.propertypro.property_platform.cms.blog.repository;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import com.propertypro.property_platform.cms.blog.domain.BlogPublicState;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

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
class BlogSchemaTests {

	private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.MICROS);
	private static final Duration DAY = Duration.ofDays(1);

	@Autowired
	private BlogRepository blogRepository;

	@Autowired
	private BlogCategoryRepository categoryRepository;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	/** API tests commit categories and blogs; this delete is rolled back with the test. */
	@BeforeEach
	void startEmpty() {
		jdbc.update("DELETE FROM blogs");
		jdbc.update("DELETE FROM blog_categories");
	}

	@Test
	void savesWithDefaultsTagsAndTimestamps() {
		BlogCategory category = categoryRepository.saveAndFlush(new BlogCategory("Home Loans", "home-loans"));
		Blog blog = new Blog("First post", "first-post");
		blog.setCategoryId(category.getId());
		blog.setTags(List.of("finance", "home-loans"));
		blog.setFeatureImage("blogs/2026/10/a1b2c3.webp");
		blogRepository.saveAndFlush(blog);
		entityManager.clear();

		Blog saved = blogRepository.findBySlug("first-post").orElseThrow();
		assertThat(saved.getStatus()).isEqualTo(BlogStatus.DRAFT);
		assertThat(saved.getTags()).containsExactly("finance", "home-loans");
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(saved.getUpdatedAt()).isNotNull();
		assertThat(categoryRepository.findById(category.getId()).orElseThrow().getStatus())
				.isEqualTo(BlogCategoryStatus.ACTIVE);
		assertThat(jdbc.queryForObject("SELECT status FROM blogs WHERE id = ?", String.class, saved.getId()))
				.isEqualTo("draft");
	}

	@Test
	void slugsAreUniqueIncludingSoftDeletedRows() {
		Blog blog = blogRepository.saveAndFlush(new Blog("Post", "same-slug"));
		blogRepository.delete(blog);
		blogRepository.flush();

		assertThat(blogRepository.findBySlug("same-slug")).isEmpty();
		assertThat(blogRepository.isSlugTaken("same-slug")).isTrue();

		BlogCategory category = categoryRepository.saveAndFlush(new BlogCategory("News", "news"));
		categoryRepository.delete(category);
		categoryRepository.flush();
		assertThat(categoryRepository.isSlugTaken("news")).isTrue();

		// Last: the failed insert aborts the PostgreSQL transaction.
		assertThatThrownBy(() -> blogRepository.saveAndFlush(new Blog("Post again", "same-slug")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"INSERT INTO blogs (title, slug) VALUES ('  ', 'blank-title')",
			"INSERT INTO blogs (title, slug) VALUES ('Bad', 'Not A Slug')",
			"INSERT INTO blogs (title, slug, status) VALUES ('Bad', 'bad-status', 'published')",
			"INSERT INTO blogs (title, slug, status) VALUES ('Bad', 'no-published-at', 'publish')",
			"INSERT INTO blogs (title, slug, feature_image) VALUES ('Bad', 'bad-image', '../etc/passwd')",
			"INSERT INTO blogs (title, slug, feature_image) VALUES ('Bad', 'url-image', 'https://x.test/a.png')",
			"INSERT INTO blogs (title, slug, tags) VALUES ('Bad', 'object-tags', '{\"a\": 1}')",
			"INSERT INTO blogs (title, slug, tags) VALUES ('Bad', 'number-tags', '[\"ok\", 1]')",
			"INSERT INTO blogs (title, slug, category_id) VALUES ('Bad', 'missing-category', 999999999)",
			"INSERT INTO blog_categories (title, slug) VALUES ('', 'blank')",
			"INSERT INTO blog_categories (title, slug) VALUES ('Bad', 'bad--slug')",
			"INSERT INTO blog_categories (title, slug, status) VALUES ('Bad', 'bad-status', 'hidden')",
			"INSERT INTO blog_categories (title, slug, icon) VALUES ('Bad', 'bad-icon', '<svg>')",
			"INSERT INTO blog_categories (title, slug, image) VALUES ('Bad', 'bad-image', '/abs/key.png')"
	})
	void rejectsInvalidRows(String insert) {
		assertThatThrownBy(() -> jdbc.update(insert)).isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void hardDeletingAReferencedCategoryIsRestricted() {
		BlogCategory category = categoryRepository.saveAndFlush(new BlogCategory("Guides", "guides"));
		Blog blog = new Blog("Guide", "guide");
		blog.setCategoryId(category.getId());
		blogRepository.saveAndFlush(blog);

		assertThatThrownBy(() -> jdbc.update("DELETE FROM blog_categories WHERE id = ?", category.getId()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void softDeletingACategoryKeepsItsBlogs() {
		BlogCategory category = categoryRepository.saveAndFlush(new BlogCategory("Market", "market"));
		Blog blog = new Blog("Trends", "trends");
		blog.setCategoryId(category.getId());
		blogRepository.saveAndFlush(blog);

		categoryRepository.delete(category);
		categoryRepository.flush();
		entityManager.clear();

		assertThat(categoryRepository.findById(category.getId())).isEmpty();
		assertThat(blogRepository.findBySlug("trends")).get().extracting(Blog::getCategoryId)
				.isEqualTo(category.getId());
	}

	@Test
	void publicRuleMatchesPublicStateForEveryCase() {
		BlogCategory tips = categoryRepository.saveAndFlush(new BlogCategory("Tips", "tips"));
		BlogCategory news = categoryRepository.saveAndFlush(new BlogCategory("News", "news"));
		BlogCategory hidden = new BlogCategory("Hidden", "hidden");
		hidden.setStatus(BlogCategoryStatus.INACTIVE);
		categoryRepository.saveAndFlush(hidden);
		BlogCategory removed = categoryRepository.saveAndFlush(new BlogCategory("Removed", "removed"));

		published("older", NOW.minus(DAY.multipliedBy(2)), tips.getId());
		published("newer", NOW.minus(DAY), news.getId());
		published("due-now", NOW, tips.getId());
		published("scheduled", NOW.plus(DAY), tips.getId());
		published("no-category", NOW.minus(DAY), null);
		published("inactive-category", NOW.minus(DAY), hidden.getId());
		published("deleted-category", NOW.minus(DAY), removed.getId());
		Blog draft = new Blog("Draft", "draft");
		draft.setCategoryId(tips.getId());
		draft.planPublication(NOW.minus(DAY));
		blogRepository.save(draft);
		Blog deleted = published("deleted", NOW.minus(DAY), tips.getId());
		blogRepository.flush();
		blogRepository.delete(deleted);
		blogRepository.flush();
		jdbc.update("UPDATE blog_categories SET deleted_at = now() WHERE id = ?", removed.getId());
		entityManager.clear();

		List<String> visible = blogRepository
			.findAll(PublicBlogs.visible(NOW, null), PageRequest.of(0, 20, PublicBlogs.ORDER))
			.map(Blog::getSlug).getContent();
		assertThat(visible).containsExactly("due-now", "newer", "older");
		assertThat(blogRepository.findAll(PublicBlogs.visible(NOW, "tips"), PageRequest.of(0, 20, PublicBlogs.ORDER))
			.map(Blog::getSlug).getContent()).containsExactly("due-now", "older");
		assertThat(blogRepository.findAll(PublicBlogs.visible(NOW, "hidden"), PageRequest.of(0, 20))).isEmpty();

		// The admin's derived state agrees with the query for every non-deleted blog.
		for (Blog blog : blogRepository.findAll()) {
			BlogCategory category = blog.getCategoryId() == null ? null
					: categoryRepository.findById(blog.getCategoryId()).orElse(null);
			assertThat(BlogPublicState.of(blog, category, NOW) == BlogPublicState.LIVE)
				.as(blog.getSlug()).isEqualTo(visible.contains(blog.getSlug()));
		}
		assertThat(blogRepository.findOne(PublicBlogs.visible(NOW, null).and(PublicBlogs.withSlug("scheduled"))))
			.isEmpty();
		assertThat(blogRepository.findOne(PublicBlogs.visible(NOW.plus(DAY), null).and(PublicBlogs.withSlug("scheduled"))))
			.isPresent();
	}

	@Test
	void tagFilterMatchesWholeTagsOnly() {
		Blog blog = new Blog("Tagged", "tagged");
		blog.setTags(List.of("home loans", "tax"));
		blogRepository.save(blog);
		blogRepository.save(new Blog("Untagged", "untagged"));
		blogRepository.flush();

		assertThat(blogRepository.findAll(BlogTagSpecs.hasTag("tax"))).extracting(Blog::getSlug).containsExactly("tagged");
		assertThat(blogRepository.findAll(BlogTagSpecs.hasTag("home loans"))).hasSize(1);
		assertThat(blogRepository.findAll(BlogTagSpecs.hasTag("home"))).isEmpty();
		assertThat(blogRepository.findAll(BlogTagSpecs.hasTag("' OR 1=1 --"))).isEmpty();
	}

	@Test
	void unpublishKeepsPublicationTime() {
		Blog blog = published("was-live", NOW.minus(DAY), null);
		blog.unpublish();
		blogRepository.saveAndFlush(blog);

		assertThat(blog.getStatus()).isEqualTo(BlogStatus.DRAFT);
		assertThat(blog.getPublishedAt()).isEqualTo(NOW.minus(DAY));
		assertThat(blog.isPublishedAt(NOW)).isFalse();
	}

	private Blog published(String slug, Instant at, Long categoryId) {
		Blog blog = new Blog(slug, slug);
		blog.setCategoryId(categoryId);
		blog.publish(at);
		return blogRepository.save(blog);
	}

}
