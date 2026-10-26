package com.propertypro.property_platform.cms.faq.service;

import com.propertypro.property_platform.cms.faq.config.FaqProperties;
import com.propertypro.property_platform.cms.faq.domain.Faq;
import com.propertypro.property_platform.cms.faq.domain.FaqStatus;
import com.propertypro.property_platform.cms.faq.dto.CreateFaqRequest;
import com.propertypro.property_platform.cms.faq.dto.FaqFilter;
import com.propertypro.property_platform.cms.faq.dto.FaqResponse;
import com.propertypro.property_platform.cms.faq.dto.FaqSummaryResponse;
import com.propertypro.property_platform.cms.faq.dto.UpdateFaqRequest;
import com.propertypro.property_platform.cms.faq.exception.FaqExceptions;
import com.propertypro.property_platform.cms.faq.repository.FaqRepository;
import com.propertypro.property_platform.cms.faq.repository.FaqSpecs;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.Permissions;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * FAQs for the admin dashboard, drafts included. FAQs are global content without an owner, so access
 * is decided by the admin controller's permissions; any status change additionally needs
 * {@code FAQ_PUBLISH}, checked here against the caller's server-side permissions. Categories are
 * validated against {@code app.faq.categories}; answers are sanitized HTML.
 */
@Service
@RequiredArgsConstructor
public class FaqService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "question", "category", "status", "sortOrder",
			"createdAt", "updatedAt");

	private final FaqRepository faqRepository;
	private final FaqRules rules;
	private final FaqProperties properties;

	@Transactional
	public FaqResponse create(CreateFaqRequest request, CurrentActor actor) {
		FaqStatus status = request.status() == null ? FaqStatus.DRAFT : FaqStatus.fromValue(request.status());
		if (status != FaqStatus.DRAFT) {
			requirePublishPermission(actor);
		}
		Faq faq = new Faq(request.question().strip(), FaqAnswer.sanitize(request.answer(), "answer"),
				rules.requireCategory(request.category()));
		faq.setStatus(status);
		faq.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
		return FaqResponse.from(faqRepository.saveAndFlush(faq), properties);
	}

	/**
	 * Explicit nulls are already rejected by validation of the request. Sending the current status is
	 * not a change and needs no {@code FAQ_PUBLISH}.
	 */
	@Transactional
	public FaqResponse update(Long id, UpdateFaqRequest request, CurrentActor actor) {
		Faq faq = find(id);
		if (request.getStatus() != null) {
			FaqStatus status = FaqStatus.fromValue(request.getStatus().orElseThrow());
			if (status != faq.getStatus()) {
				requirePublishPermission(actor);
				faq.setStatus(status);
			}
		}
		apply(request.getQuestion(), question -> faq.setQuestion(question.strip()));
		apply(request.getAnswer(), answer -> faq.setAnswer(FaqAnswer.sanitize(answer, "answer")));
		apply(request.getCategory(), category -> faq.setCategory(rules.requireCategory(category)));
		apply(request.getSortOrder(), faq::setSortOrder);
		// Flushes so database checks fail inside this call and the response has the new updatedAt.
		return FaqResponse.from(faqRepository.saveAndFlush(faq), properties);
	}

	/** Permanent delete; 404 when the FAQ does not exist, also when another request deleted it first. */
	@Transactional
	public void delete(Long id) {
		if (faqRepository.deleteFaqById(id) == 0) {
			throw FaqExceptions.notFound();
		}
	}

	@Transactional(readOnly = true)
	public FaqResponse get(Long id) {
		return FaqResponse.from(find(id), properties);
	}

	@Transactional(readOnly = true)
	public PageResponse<FaqSummaryResponse> list(FaqFilter filter, Pageable pageable) {
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		return PageResponse.of(faqRepository.findAll(matching(filter), request),
				faq -> FaqSummaryResponse.from(faq, properties));
	}

	private Faq find(Long id) {
		return faqRepository.findById(id).orElseThrow(FaqExceptions::notFound);
	}

	private static void requirePublishPermission(CurrentActor actor) {
		if (!actor.has(Permissions.FAQ_PUBLISH)) {
			throw FaqExceptions.publishForbidden();
		}
	}

	/** PATCH field: {@code null} = omitted (skip); otherwise set the value. */
	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElseThrow());
		}
	}

	private static Sort stableSort(Sort requested) {
		for (Sort.Order order : requested) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		// Unique tiebreaker, so rows with equal sort values never repeat or go missing across pages.
		return requested.getOrderFor("id") != null ? requested : requested.and(Sort.by(Sort.Direction.ASC, "id"));
	}

	private static Specification<Faq> matching(FaqFilter filter) {
		Specification<Faq> fields = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), FaqStatus.fromValue(filter.status())));
			}
			if (filter.category() != null) {
				predicates.add(cb.equal(root.get("category"), filter.category()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		return filter.search() == null || filter.search().isBlank() ? fields
				: fields.and(FaqSpecs.containing(filter.search()));
	}

}
