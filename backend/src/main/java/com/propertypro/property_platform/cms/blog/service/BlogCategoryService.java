package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import com.propertypro.property_platform.cms.blog.dto.BlogCategoryFilter;
import com.propertypro.property_platform.cms.blog.dto.BlogCategoryResponse;
import com.propertypro.property_platform.cms.blog.dto.CreateBlogCategoryForm;
import com.propertypro.property_platform.cms.blog.dto.UpdateBlogCategoryRequest;
import com.propertypro.property_platform.cms.blog.exception.BlogCategoryExceptions;
import com.propertypro.property_platform.cms.blog.repository.BlogCategoryRepository;
import com.propertypro.property_platform.cms.blog.repository.BlogRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * Blog categories for the admin dashboard. Categories are global content without an owner, so access
 * is decided by the admin controller's permissions.
 * <p>
 * Slug policy: generated from the title when the client sends none, otherwise used as is; never
 * changed by a title edit (public URLs stay stable); unique among all categories, deleted ones
 * included. Delete policy: soft delete, refused with 409 while any non-deleted blog uses the category.
 */
@Service
@RequiredArgsConstructor
public class BlogCategoryService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "title", "slug", "status", "createdAt", "updatedAt");
	private static final String KEY_PREFIX = "blog-categories";
	private static final String SLUG_CONSTRAINT = "uq_blog_categories_slug";

	private final BlogCategoryRepository categoryRepository;
	private final BlogRepository blogRepository;
	private final BlogCategorySlugs slugs;
	private final MediaUploadService uploadService;
	private final MediaStorage storage;

	/** Validates every field before the image is stored; the stored file is removed if the transaction fails. */
	@Transactional
	public BlogCategoryResponse create(CreateBlogCategoryForm form, MultipartFile image) {
		String title = form.title().strip();
		BlogCategoryStatus status = form.status() == null ? BlogCategoryStatus.ACTIVE
				: BlogCategoryStatus.fromValue(form.status());
		String slug = form.slug() == null ? slugs.generate(title) : slugs.requireAvailable(form.slug());

		BlogCategory category = new BlogCategory(title, slug);
		category.setStatus(status);
		category.setIcon(form.icon());
		category.setMetaTitle(optionalText(form.metaTitle()));
		category.setMetaDescription(optionalText(form.metaDescription()));
		if (image != null) {
			category.setImage(uploadService.store(image, BlogImage.TYPES, KEY_PREFIX, "image").storageKey());
		}
		return BlogCategoryResponse.from(save(category), 0);
	}

	/** Explicit nulls for required fields are already rejected by validation of the request. */
	@Transactional
	public BlogCategoryResponse update(Long id, UpdateBlogCategoryRequest request) {
		BlogCategory category = find(id);
		apply(request.getTitle(), title -> category.setTitle(title.strip()));
		apply(request.getSlug(), slug -> {
			if (!slug.equals(category.getSlug())) {
				category.changeSlug(slugs.requireAvailable(slug));
			}
		});
		apply(request.getIcon(), category::setIcon);
		apply(request.getStatus(), status -> category.setStatus(BlogCategoryStatus.fromValue(status)));
		apply(request.getMetaTitle(), metaTitle -> category.setMetaTitle(optionalText(metaTitle)));
		apply(request.getMetaDescription(),
				metaDescription -> category.setMetaDescription(optionalText(metaDescription)));
		return response(save(category));
	}

	/** The old file is deleted only after the change commits, and only when no category row still uses it. */
	@Transactional
	public BlogCategoryResponse replaceImage(Long id, MultipartFile image) {
		BlogCategory category = find(id);
		String previous = category.getImage();
		category.setImage(uploadService.store(image, BlogImage.TYPES, KEY_PREFIX, "image").storageKey());
		BlogCategory saved = save(category);
		deleteFileIfUnused(previous);
		return response(saved);
	}

	@Transactional
	public BlogCategoryResponse removeImage(Long id) {
		BlogCategory category = find(id);
		String previous = category.getImage();
		category.setImage(null);
		BlogCategory saved = save(category);
		deleteFileIfUnused(previous);
		return response(saved);
	}

	/**
	 * Soft delete: sets deleted_at; the row and its image file are kept. The category row stays locked
	 * until commit, so a blog cannot be assigned to it between the check and the delete.
	 */
	@Transactional
	public void delete(Long id) {
		BlogCategory category = categoryRepository.findByIdForUpdate(id).orElseThrow(BlogCategoryExceptions::notFound);
		long blogCount = blogRepository.countByCategoryId(id);
		if (blogCount > 0) {
			throw BlogCategoryExceptions.inUse(blogCount);
		}
		categoryRepository.delete(category);
		categoryRepository.flush();
	}

	@Transactional(readOnly = true)
	public BlogCategoryResponse get(Long id) {
		return response(find(id));
	}

	/** Two queries per page: the categories, then the blog counts of those categories. */
	@Transactional(readOnly = true)
	public PageResponse<BlogCategoryResponse> list(BlogCategoryFilter filter, Pageable pageable) {
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		Page<BlogCategory> page = categoryRepository.findAll(matching(filter), request);
		Map<Long, Long> blogCounts = page.isEmpty() ? Map.of()
				: blogRepository.countByCategoryIds(page.map(BlogCategory::getId).getContent()).stream()
					.collect(Collectors.toMap(BlogRepository.CategoryBlogCount::getCategoryId,
							BlogRepository.CategoryBlogCount::getBlogCount));
		return PageResponse.of(page,
				category -> BlogCategoryResponse.from(category, blogCounts.getOrDefault(category.getId(), 0L)));
	}

	@Transactional(readOnly = true)
	public BlogImage image(Long id, String fileName) {
		return BlogImage.load(storage, find(id).getImage(), fileName, BlogCategoryExceptions::imageNotFound);
	}

	private BlogCategory find(Long id) {
		return categoryRepository.findById(id).orElseThrow(BlogCategoryExceptions::notFound);
	}

	private BlogCategoryResponse response(BlogCategory category) {
		return BlogCategoryResponse.from(category, blogRepository.countByCategoryId(category.getId()));
	}

	/**
	 * Flushes so database checks fail inside this call and the response has the new updatedAt. Slug
	 * writes are serialized by {@link BlogCategorySlugs}; the constraint only fires if something
	 * bypassed it, and is still reported as a conflict rather than a server error.
	 */
	private BlogCategory save(BlogCategory category) {
		try {
			return categoryRepository.saveAndFlush(category);
		}
		catch (DataIntegrityViolationException ex) {
			if (ex.getCause() instanceof ConstraintViolationException violation
					&& SLUG_CONSTRAINT.equals(violation.getConstraintName())) {
				throw BlogCategoryExceptions.slugTaken();
			}
			throw ex;
		}
	}

	private void deleteFileIfUnused(String storageKey) {
		if (storageKey != null && categoryRepository.countAllByImageIncludingDeleted(storageKey) == 0) {
			uploadService.deleteAfterCommit(storageKey);
		}
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

	private static Sort stableSort(Sort requested) {
		for (Sort.Order order : requested) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		// Unique tiebreaker, so rows with equal sort values never repeat or go missing across pages.
		return requested.getOrderFor("id") != null ? requested : requested.and(Sort.by(Sort.Direction.DESC, "id"));
	}

	/** Soft-deleted categories are excluded by {@code @SoftDelete}. */
	private static Specification<BlogCategory> matching(BlogCategoryFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\')));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), BlogCategoryStatus.fromValue(filter.status())));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
