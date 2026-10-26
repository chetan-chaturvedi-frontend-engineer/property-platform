package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import com.propertypro.property_platform.cms.blog.dto.BlogFilter;
import com.propertypro.property_platform.cms.blog.dto.BlogResponse;
import com.propertypro.property_platform.cms.blog.dto.BlogSummaryResponse;
import com.propertypro.property_platform.cms.blog.dto.CreateBlogForm;
import com.propertypro.property_platform.cms.blog.dto.UpdateBlogRequest;
import com.propertypro.property_platform.cms.blog.exception.BlogExceptions;
import com.propertypro.property_platform.cms.blog.repository.BlogCategoryRepository;
import com.propertypro.property_platform.cms.blog.repository.BlogRepository;
import com.propertypro.property_platform.cms.blog.repository.BlogTagSpecs;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.media.service.MediaUploadService;
import com.propertypro.property_platform.media.storage.MediaStorage;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Blogs for the admin dashboard: every non-deleted blog in every state. Blogs are global content
 * without an owner, so access is decided by the admin controller's permissions.
 * <p>
 * Publication rules (server-side; "now" is always the server clock):
 * <ul>
 * <li>{@code publish} needs a category and a {@code publishedAt}; publishing a draft without one sets
 * it to now, a future value schedules the post. Public endpoints show it from {@code publishedAt} on,
 * and only while its category is active.</li>
 * <li>{@code draft} is never public; its {@code publishedAt} is only a planned time, kept when a
 * published blog returns to draft.</li>
 * </ul>
 * Slug policy as for categories: generated from the title when the client sends none, never changed
 * by a title edit, unique among all blogs (deleted ones included). Content is sanitized HTML.
 */
@Service
@RequiredArgsConstructor
public class BlogService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "title", "slug", "status", "publishedAt", "createdAt",
			"updatedAt");
	private static final String KEY_PREFIX = "blogs";
	private static final String SLUG_CONSTRAINT = "uq_blogs_slug";

	private final BlogRepository blogRepository;
	private final BlogCategoryRepository categoryRepository;
	private final BlogSlugs slugs;
	private final MediaUploadService uploadService;
	private final MediaStorage storage;
	private final Clock clock;

	/** Validates every field before the image is stored; the stored file is removed if the transaction fails. */
	@Transactional
	public BlogResponse create(CreateBlogForm form, MultipartFile featureImage) {
		Instant now = now();
		String title = form.title().strip();
		BlogStatus status = form.status() == null ? BlogStatus.DRAFT : BlogStatus.fromValue(form.status());
		BlogCategory category = form.categoryId() == null ? null : assignableCategory(form.categoryId());
		if (status == BlogStatus.PUBLISH) {
			requirePublishable(category);
		}
		String content = BlogContent.sanitize(form.content(), "content");
		List<String> tags = BlogTags.normalize(form.tags(), "tags");
		String slug = form.slug() == null ? slugs.generate(title) : slugs.requireAvailable(form.slug());

		Blog blog = new Blog(title, slug);
		blog.setCategoryId(category == null ? null : category.getId());
		blog.setShortDescription(optionalText(form.shortDescription()));
		blog.setContent(content);
		blog.setMetaTitle(optionalText(form.metaTitle()));
		blog.setMetaDescription(optionalText(form.metaDescription()));
		blog.setTags(tags);
		Instant publishedAt = micros(form.publishedAt());
		if (status == BlogStatus.PUBLISH) {
			blog.publish(publishedAt != null ? publishedAt : now);
		}
		else {
			blog.planPublication(publishedAt);
		}
		if (featureImage != null) {
			blog.setFeatureImage(uploadService.store(featureImage, BlogImage.TYPES, KEY_PREFIX, "featureImage").storageKey());
		}
		return BlogResponse.from(save(blog), category, now);
	}

	/** Explicit nulls for required fields are already rejected by validation of the request. */
	@Transactional
	public BlogResponse update(Long id, UpdateBlogRequest request) {
		Instant now = now();
		Blog blog = find(id);
		BlogCategory category;
		if (request.getCategoryId() == null) {
			category = categoryOf(blog);
		}
		else {
			category = request.getCategoryId().map(this::assignableCategory).orElse(null);
			blog.setCategoryId(category == null ? null : category.getId());
		}

		apply(request.getTitle(), title -> blog.setTitle(title.strip()));
		apply(request.getSlug(), slug -> {
			if (!slug.equals(blog.getSlug())) {
				blog.changeSlug(slugs.requireAvailable(slug));
			}
		});
		apply(request.getShortDescription(), text -> blog.setShortDescription(optionalText(text)));
		apply(request.getContent(), content -> blog.setContent(BlogContent.sanitize(content, "content")));
		apply(request.getMetaTitle(), text -> blog.setMetaTitle(optionalText(text)));
		apply(request.getMetaDescription(), text -> blog.setMetaDescription(optionalText(text)));
		apply(request.getTags(), tags -> blog.setTags(BlogTags.normalize(tags, "tags")));
		updatePublication(blog, request, category, now);
		return BlogResponse.from(save(blog), category, now);
	}

	/** The old file is deleted only after the change commits, and only when no blog row still uses it. */
	@Transactional
	public BlogResponse replaceFeatureImage(Long id, MultipartFile image) {
		Blog blog = find(id);
		String previous = blog.getFeatureImage();
		blog.setFeatureImage(uploadService.store(image, BlogImage.TYPES, KEY_PREFIX, "featureImage").storageKey());
		Blog saved = save(blog);
		deleteFileIfUnused(previous);
		return BlogResponse.from(saved, categoryOf(saved), now());
	}

	@Transactional
	public BlogResponse removeFeatureImage(Long id) {
		Blog blog = find(id);
		String previous = blog.getFeatureImage();
		blog.setFeatureImage(null);
		Blog saved = save(blog);
		deleteFileIfUnused(previous);
		return BlogResponse.from(saved, categoryOf(saved), now());
	}

	/** Soft delete: sets deleted_at; the row and its feature image file are kept. */
	@Transactional
	public void delete(Long id) {
		blogRepository.delete(find(id));
		blogRepository.flush();
	}

	@Transactional(readOnly = true)
	public BlogResponse get(Long id) {
		Blog blog = find(id);
		return BlogResponse.from(blog, categoryOf(blog), now());
	}

	/** Two queries per page: the blogs (without loading anything else), then their categories. */
	@Transactional(readOnly = true)
	public PageResponse<BlogSummaryResponse> list(BlogFilter filter, Pageable pageable) {
		requireOrdered(filter.publishedFrom(), filter.publishedTo(), "publishedTo", "must not be before publishedFrom");
		requireOrdered(filter.createdFrom(), filter.createdTo(), "createdTo", "must not be before createdFrom");
		String tag = filter.tag() == null || filter.tag().isBlank() ? null : BlogTags.normalize(filter.tag(), "tag");
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		Page<Blog> page = blogRepository.findAll(matching(filter, tag), request);
		Function<Blog, BlogCategory> categories = categoriesOf(categoryRepository, page.getContent());
		Instant now = now();
		return PageResponse.of(page, blog -> BlogSummaryResponse.from(blog, categories.apply(blog), now));
	}

	@Transactional(readOnly = true)
	public BlogImage featureImage(Long id, String fileName) {
		return BlogImage.load(storage, find(id).getFeatureImage(), fileName, BlogExceptions::imageNotFound);
	}

	/**
	 * Non-deleted categories of the blogs, loaded in one query; the function returns null for a blog
	 * without a category.
	 */
	static Function<Blog, BlogCategory> categoriesOf(BlogCategoryRepository categoryRepository, Collection<Blog> blogs) {
		List<Long> ids = blogs.stream().map(Blog::getCategoryId).filter(Objects::nonNull).distinct().toList();
		Map<Long, BlogCategory> byId = ids.isEmpty() ? Map.of()
				: categoryRepository.findAllById(ids).stream().collect(Collectors.toMap(BlogCategory::getId, Function.identity()));
		return blog -> blog.getCategoryId() == null ? null : byId.get(blog.getCategoryId());
	}

	private void updatePublication(Blog blog, UpdateBlogRequest request, BlogCategory category, Instant now) {
		BlogStatus status = request.getStatus() == null ? blog.getStatus()
				: BlogStatus.fromValue(request.getStatus().orElseThrow());
		boolean timeGiven = request.getPublishedAt() != null;
		Instant publishedAt = timeGiven ? micros(request.getPublishedAt().orElse(null)) : blog.getPublishedAt();
		if (status == BlogStatus.DRAFT) {
			blog.unpublish();
			blog.planPublication(publishedAt);
			return;
		}
		requirePublishable(category);
		if (timeGiven && publishedAt == null) {
			throw new FieldValidationException("publishedAt", "must not be null while status is publish");
		}
		if (!timeGiven && blog.getStatus() == BlogStatus.DRAFT) {
			// Publishing a draft without a time: now. A planned time must be sent to schedule it.
			publishedAt = now;
		}
		blog.publish(publishedAt);
	}

	/** 400 unless the category exists and is not deleted; share-locked so it cannot be deleted meanwhile. */
	private BlogCategory assignableCategory(Long categoryId) {
		return categoryRepository.findByIdForShare(categoryId)
			.orElseThrow(() -> new FieldValidationException("categoryId", "must be an existing blog category"));
	}

	private static void requirePublishable(BlogCategory category) {
		if (category == null) {
			throw new FieldValidationException("categoryId", "is required to publish");
		}
	}

	private BlogCategory categoryOf(Blog blog) {
		return blog.getCategoryId() == null ? null : categoryRepository.findById(blog.getCategoryId()).orElse(null);
	}

	private Blog find(Long id) {
		return blogRepository.findById(id).orElseThrow(BlogExceptions::notFound);
	}

	/**
	 * Flushes so database checks fail inside this call and the response has the new updatedAt. Slug
	 * writes are serialized by {@link BlogSlugs}; the constraint only fires if something bypassed it,
	 * and is still reported as a conflict rather than a server error.
	 */
	private Blog save(Blog blog) {
		try {
			return blogRepository.saveAndFlush(blog);
		}
		catch (DataIntegrityViolationException ex) {
			if (ex.getCause() instanceof ConstraintViolationException violation
					&& SLUG_CONSTRAINT.equals(violation.getConstraintName())) {
				throw BlogExceptions.slugTaken();
			}
			throw ex;
		}
	}

	private void deleteFileIfUnused(String storageKey) {
		if (storageKey != null && blogRepository.countAllByFeatureImageIncludingDeleted(storageKey) == 0) {
			uploadService.deleteAfterCommit(storageKey);
		}
	}

	/** Database precision, so responses match what a later read returns. */
	private Instant now() {
		return clock.instant().truncatedTo(ChronoUnit.MICROS);
	}

	private static Instant micros(Instant value) {
		return value == null ? null : value.truncatedTo(ChronoUnit.MICROS);
	}

	/** Blank optional text is stored as null. */
	private static String optionalText(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

	/** PATCH field: {@code null} = omitted (skip); otherwise set the value, or null for an explicit JSON null. */
	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

	private static <T extends Comparable<? super T>> void requireOrdered(T from, T to, String field, String message) {
		if (from != null && to != null && to.compareTo(from) < 0) {
			throw new FieldValidationException(field, message);
		}
	}

	private static Sort stableSort(Sort requested) {
		for (Sort.Order order : requested) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		// Unique tiebreaker, so rows with equal sort values never repeat or go missing across pages.
		return requested.getOrderFor("id") != null ? requested : requested.and(Sort.by(Sort.Direction.DESC, "id"));
	}

	/** Soft-deleted blogs are excluded by {@code @SoftDelete}. */
	private static Specification<Blog> matching(BlogFilter filter, String tag) {
		Specification<Blog> fields = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + BlogCategoryService.escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\')));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), BlogStatus.fromValue(filter.status())));
			}
			if (filter.categoryId() != null) {
				predicates.add(cb.equal(root.get("categoryId"), filter.categoryId()));
			}
			if (filter.publishedFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("publishedAt"), filter.publishedFrom()));
			}
			if (filter.publishedTo() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<Instant>get("publishedAt"), filter.publishedTo()));
			}
			if (filter.createdFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"), filter.createdFrom()));
			}
			if (filter.createdTo() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<Instant>get("createdAt"), filter.createdTo()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		return tag == null ? fields : fields.and(BlogTagSpecs.hasTag(tag));
	}

}
