package com.propertypro.property_platform.cms.page.service;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;
import com.propertypro.property_platform.cms.page.dto.AdminPageResponse;
import com.propertypro.property_platform.cms.page.dto.CreatePageRequest;
import com.propertypro.property_platform.cms.page.dto.PageFilter;
import com.propertypro.property_platform.cms.page.dto.PageSummaryResponse;
import com.propertypro.property_platform.cms.page.dto.UpdatePageRequest;
import com.propertypro.property_platform.cms.page.exception.PageExceptions;
import com.propertypro.property_platform.cms.page.repository.PageRepository;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.Permissions;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * Content pages for the admin dashboard, drafts included. Pages are global content without an owner,
 * so access is decided by the admin controller's permissions; any status change additionally needs
 * {@code PAGE_PUBLISH}, checked here against the caller's server-side permissions. {@code type} is a
 * label only: system pages follow the same permissions as static ones.
 * <p>
 * Slug policy as for blogs: generated from the heading when the client sends none, never changed by a
 * heading edit, unique among all pages. Content is sanitized HTML.
 */
@Service
@RequiredArgsConstructor
public class PageService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "heading", "slug", "type", "status", "createdAt",
			"updatedAt");
	private static final String SLUG_CONSTRAINT = "uq_pages_slug";

	private final PageRepository pageRepository;
	private final PageSlugs slugs;

	@Transactional
	public AdminPageResponse create(CreatePageRequest request, CurrentActor actor) {
		PageStatus status = request.status() == null ? PageStatus.DRAFT : PageStatus.fromValue(request.status());
		if (status != PageStatus.DRAFT) {
			requirePublishPermission(actor);
		}
		String heading = request.heading().strip();
		String content = PageContent.sanitize(request.content(), "content");
		String slug = request.slug() == null ? slugs.generate(heading) : slugs.requireAvailable(request.slug(), null);

		Page page = new Page(heading, slug);
		page.setSubHeading(optionalText(request.subHeading()));
		page.setContent(content);
		page.setType(request.type() == null ? PageType.STATIC : PageType.fromValue(request.type()));
		page.setStatus(status);
		page.setMetaTitle(optionalText(request.metaTitle()));
		page.setMetaDescription(optionalText(request.metaDescription()));
		page.setMetaKeywords(optionalText(request.metaKeywords()));
		return AdminPageResponse.from(save(page));
	}

	/**
	 * Explicit nulls for required fields are already rejected by validation of the request. Sending the
	 * current status is not a change and needs no {@code PAGE_PUBLISH}.
	 */
	@Transactional
	public AdminPageResponse update(Long id, UpdatePageRequest request, CurrentActor actor) {
		Page page = find(id);
		if (request.getStatus() != null) {
			PageStatus status = PageStatus.fromValue(request.getStatus().orElseThrow());
			if (status != page.getStatus()) {
				requirePublishPermission(actor);
				page.setStatus(status);
			}
		}
		apply(request.getHeading(), heading -> page.setHeading(heading.strip()));
		apply(request.getSlug(), slug -> {
			if (!slug.equals(page.getSlug())) {
				page.changeSlug(slugs.requireAvailable(slug, page.getId()));
			}
		});
		apply(request.getContent(), content -> page.setContent(PageContent.sanitize(content, "content")));
		apply(request.getType(), type -> page.setType(PageType.fromValue(type)));
		apply(request.getSubHeading(), text -> page.setSubHeading(optionalText(text)));
		apply(request.getMetaTitle(), text -> page.setMetaTitle(optionalText(text)));
		apply(request.getMetaDescription(), text -> page.setMetaDescription(optionalText(text)));
		apply(request.getMetaKeywords(), text -> page.setMetaKeywords(optionalText(text)));
		return AdminPageResponse.from(save(page));
	}

	/** Permanent delete; 404 when the page does not exist, also when another request deleted it first. */
	@Transactional
	public void delete(Long id) {
		if (pageRepository.deletePageById(id) == 0) {
			throw PageExceptions.notFound();
		}
	}

	@Transactional(readOnly = true)
	public AdminPageResponse get(Long id) {
		return AdminPageResponse.from(find(id));
	}

	@Transactional(readOnly = true)
	public PageResponse<PageSummaryResponse> list(PageFilter filter, Pageable pageable) {
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		return PageResponse.of(pageRepository.findAll(matching(filter), request), PageSummaryResponse::from);
	}

	private Page find(Long id) {
		return pageRepository.findById(id).orElseThrow(PageExceptions::notFound);
	}

	/**
	 * Flushes so database checks fail inside this call and the response has the new updatedAt. Slug
	 * writes are serialized by {@link PageSlugs}; the constraint only fires if something bypassed it,
	 * and is still reported as a conflict rather than a server error.
	 */
	private Page save(Page page) {
		try {
			return pageRepository.saveAndFlush(page);
		}
		catch (DataIntegrityViolationException ex) {
			if (ex.getCause() instanceof ConstraintViolationException violation
					&& SLUG_CONSTRAINT.equals(violation.getConstraintName())) {
				throw PageExceptions.slugTaken();
			}
			throw ex;
		}
	}

	private static void requirePublishPermission(CurrentActor actor) {
		if (!actor.has(Permissions.PAGE_PUBLISH)) {
			throw PageExceptions.publishForbidden();
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

	private static Specification<Page> matching(PageFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("heading")), pattern, '\\'),
						cb.like(cb.lower(root.get("subHeading")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\')));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), PageStatus.fromValue(filter.status())));
			}
			if (filter.type() != null) {
				predicates.add(cb.equal(root.get("type"), PageType.fromValue(filter.type())));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	/** LIKE wildcards in the search text are literal. */
	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
