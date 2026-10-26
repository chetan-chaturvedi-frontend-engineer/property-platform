package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogCategoryResponse;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogFilter;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogResponse;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogSummaryResponse;
import com.propertypro.property_platform.cms.blog.exception.BlogCategoryExceptions;
import com.propertypro.property_platform.cms.blog.exception.BlogExceptions;
import com.propertypro.property_platform.cms.blog.repository.BlogCategoryRepository;
import com.propertypro.property_platform.cms.blog.repository.BlogRepository;
import com.propertypro.property_platform.cms.blog.repository.BlogTagSpecs;
import com.propertypro.property_platform.cms.blog.repository.PublicBlogs;
import com.propertypro.property_platform.common.text.Slugs;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.media.storage.MediaStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Locale;
import java.util.function.Function;

/**
 * Blogs and categories for the mobile app and website, without login. Every blog query goes through
 * {@link PublicBlogs#visible}, so drafts, scheduled, deleted and category-hidden blogs are never
 * returned, and anything not visible is a plain 404 that does not reveal whether it exists. The client
 * chooses filters and page only, never the visibility rules or the order. "Now" is the server clock.
 */
@Service
@RequiredArgsConstructor
public class PublicBlogService {

	private static final Sort CATEGORY_ORDER = Sort.by("title", "id");

	private final BlogRepository blogRepository;
	private final BlogCategoryRepository categoryRepository;
	private final MediaStorage storage;
	private final Clock clock;

	@Transactional(readOnly = true)
	public PageResponse<PublicBlogSummaryResponse> list(PublicBlogFilter filter, Pageable pageable) {
		Specification<Blog> spec = PublicBlogs.visible(clock.instant(), filter.category());
		if (filter.search() != null && !filter.search().isBlank()) {
			spec = spec.and(searching(filter.search()));
		}
		if (filter.tag() != null && !filter.tag().isBlank()) {
			spec = spec.and(BlogTagSpecs.hasTag(BlogTags.normalize(filter.tag(), "tag")));
		}
		Page<Blog> page = blogRepository.findAll(spec,
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), PublicBlogs.ORDER));
		Function<Blog, BlogCategory> categories = BlogService.categoriesOf(categoryRepository, page.getContent());
		return PageResponse.of(page, blog -> PublicBlogSummaryResponse.from(blog, categories.apply(blog)));
	}

	/** 404 for an unknown, inactive or deleted category, otherwise its visible blogs (possibly none). */
	@Transactional(readOnly = true)
	public PageResponse<PublicBlogSummaryResponse> listByCategory(String categorySlug, Pageable pageable) {
		visibleCategory(categorySlug);
		return list(new PublicBlogFilter(null, categorySlug, null), pageable);
	}

	@Transactional(readOnly = true)
	public PublicBlogResponse get(String slug) {
		Blog blog = visibleBlog(slug);
		BlogCategory category = categoryRepository.findById(blog.getCategoryId()).orElseThrow(BlogExceptions::notFound);
		return PublicBlogResponse.from(blog, category);
	}

	@Transactional(readOnly = true)
	public BlogImage featureImage(String slug, String fileName) {
		return BlogImage.load(storage, visibleBlog(slug).getFeatureImage(), fileName, BlogExceptions::imageNotFound);
	}

	/** Active categories by title. */
	@Transactional(readOnly = true)
	public PageResponse<PublicBlogCategoryResponse> listCategories(Pageable pageable) {
		return PageResponse.of(categoryRepository.findAllByStatus(BlogCategoryStatus.ACTIVE,
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), CATEGORY_ORDER)),
				PublicBlogCategoryResponse::from);
	}

	@Transactional(readOnly = true)
	public BlogImage categoryImage(String slug, String fileName) {
		return BlogImage.load(storage, visibleCategory(slug).getImage(), fileName, BlogCategoryExceptions::imageNotFound);
	}

	/** Malformed slugs are 404 without a query, like unknown or hidden ones. */
	private Blog visibleBlog(String slug) {
		if (!Slugs.isValid(slug)) {
			throw BlogExceptions.notFound();
		}
		return blogRepository.findOne(PublicBlogs.visible(clock.instant(), null).and(PublicBlogs.withSlug(slug)))
			.orElseThrow(BlogExceptions::notFound);
	}

	private BlogCategory visibleCategory(String slug) {
		if (!Slugs.isValid(slug)) {
			throw BlogCategoryExceptions.notFound();
		}
		return categoryRepository.findBySlug(slug).filter(BlogCategory::isActive)
			.orElseThrow(BlogCategoryExceptions::notFound);
	}

	/** Title or short description contains the text, case-insensitively; LIKE wildcards are literal. */
	private static Specification<Blog> searching(String search) {
		String pattern = "%" + BlogCategoryService.escapeLike(search.strip().toLowerCase(Locale.ROOT)) + "%";
		return (root, query, cb) -> cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
				cb.like(cb.lower(root.get("shortDescription")), pattern, '\\'));
	}

}
