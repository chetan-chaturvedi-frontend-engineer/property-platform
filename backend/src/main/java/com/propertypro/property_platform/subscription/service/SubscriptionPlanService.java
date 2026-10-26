package com.propertypro.property_platform.subscription.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.text.Slugs;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.subscription.domain.BillingInterval;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import com.propertypro.property_platform.subscription.dto.ChangeSubscriptionPlanStatusRequest;
import com.propertypro.property_platform.subscription.dto.CreateSubscriptionPlanRequest;
import com.propertypro.property_platform.subscription.dto.SubscriptionPlanFilter;
import com.propertypro.property_platform.subscription.dto.SubscriptionPlanResponse;
import com.propertypro.property_platform.subscription.dto.UpdateSubscriptionPlanRequest;
import com.propertypro.property_platform.subscription.exception.SubscriptionPlanExceptions;
import com.propertypro.property_platform.subscription.repository.SubscriptionPlanRepository;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Admin management of the plan catalog. Plans are global (no owner): access is decided by the
 * controller's permissions. Status changes never touch user subscriptions.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("sortOrder", "title", "price", "createdAt", "updatedAt");
	private static final String SLUG_CONSTRAINT = "uq_subscription_plans_slug";
	// Leaves room for a "-<n>" suffix within SLUG_MAX_LENGTH.
	private static final int SLUG_BASE_MAX_LENGTH = SubscriptionPlan.SLUG_MAX_LENGTH - 10;
	private static final int MAX_NUMBERED_SLUGS = 50;
	private static final String FALLBACK_SLUG = "plan";

	private final SubscriptionPlanRepository planRepository;

	@Transactional
	public SubscriptionPlanResponse create(CreateSubscriptionPlanRequest request) {
		String slug = request.slug() != null ? requireFreeSlug(request.slug(), null) : generateSlug(request.title());
		SubscriptionPlan plan = new SubscriptionPlan(request.title().strip(), slug, request.price());
		plan.setIcon(request.icon());
		plan.setPhoto(request.photo());
		plan.setDescription(request.description());
		plan.setNoOfProperties(request.noOfProperties());
		// Omitted fields keep the entity defaults, which mirror the column defaults.
		Optional.ofNullable(request.currency()).ifPresent(plan::setCurrency);
		Optional.ofNullable(request.billingInterval()).map(BillingInterval::fromValue).ifPresent(plan::setBillingInterval);
		Optional.ofNullable(request.billingIntervalCount()).ifPresent(plan::setBillingIntervalCount);
		Optional.ofNullable(request.features()).map(SubscriptionPlanService::normalizeFeatures).ifPresent(plan::setFeatures);
		Optional.ofNullable(request.status()).map(SubscriptionPlanStatus::fromValue).ifPresent(plan::setStatus);
		Optional.ofNullable(request.popular()).ifPresent(plan::setPopular);
		Optional.ofNullable(request.sortOrder()).ifPresent(plan::setSortOrder);
		Optional.ofNullable(request.trialDays()).ifPresent(plan::setTrialDays);
		validateRules(plan);
		return SubscriptionPlanResponse.from(save(plan));
	}

	/** Explicit nulls for required fields are already rejected by validation of the request. */
	@Transactional
	public SubscriptionPlanResponse update(Long id, UpdateSubscriptionPlanRequest request) {
		SubscriptionPlan plan = find(id);
		apply(request.getIcon(), plan::setIcon);
		apply(request.getPhoto(), plan::setPhoto);
		apply(request.getTitle(), title -> plan.setTitle(title.strip()));
		apply(request.getSlug(), slug -> plan.setSlug(requireFreeSlug(slug, id)));
		apply(request.getPrice(), plan::setPrice);
		apply(request.getCurrency(), plan::setCurrency);
		apply(request.getBillingInterval(), value -> plan.setBillingInterval(BillingInterval.fromValue(value)));
		apply(request.getBillingIntervalCount(), plan::setBillingIntervalCount);
		apply(request.getDescription(), plan::setDescription);
		apply(request.getNoOfProperties(), plan::setNoOfProperties);
		apply(request.getFeatures(), features -> plan.setFeatures(normalizeFeatures(features)));
		apply(request.getStatus(), value -> plan.setStatus(SubscriptionPlanStatus.fromValue(value)));
		apply(request.getPopular(), plan::setPopular);
		apply(request.getSortOrder(), plan::setSortOrder);
		apply(request.getTrialDays(), plan::setTrialDays);
		validateRules(plan);
		return SubscriptionPlanResponse.from(save(plan));
	}

	@Transactional
	public SubscriptionPlanResponse changeStatus(Long id, ChangeSubscriptionPlanStatusRequest request) {
		SubscriptionPlan plan = find(id);
		plan.setStatus(SubscriptionPlanStatus.fromValue(request.status()));
		return SubscriptionPlanResponse.from(save(plan));
	}

	@Transactional(readOnly = true)
	public SubscriptionPlanResponse get(Long id) {
		return SubscriptionPlanResponse.from(find(id));
	}

	@Transactional(readOnly = true)
	public PageResponse<SubscriptionPlanResponse> list(SubscriptionPlanFilter filter, Pageable pageable) {
		requireOrdered(filter.minPrice(), filter.maxPrice(), "maxPrice", "must not be less than minPrice");
		requireOrdered(filter.createdFrom(), filter.createdTo(), "createdTo", "must not be before createdFrom");
		PageRequest page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		return PageResponse.of(planRepository.findAll(matching(filter), page), SubscriptionPlanResponse::from);
	}

	private SubscriptionPlan find(Long id) {
		return planRepository.findById(id).orElseThrow(SubscriptionPlanExceptions::notFound);
	}

	/** Flushes so a concurrent duplicate slug fails here as 409 and the response has the new updatedAt. */
	private SubscriptionPlan save(SubscriptionPlan plan) {
		try {
			return planRepository.saveAndFlush(plan);
		}
		catch (DataIntegrityViolationException ex) {
			if (ex.getCause() instanceof ConstraintViolationException violation
					&& SLUG_CONSTRAINT.equals(violation.getConstraintName())) {
				throw SubscriptionPlanExceptions.slugTaken();
			}
			throw ex;
		}
	}

	private String requireFreeSlug(String slug, Long currentPlanId) {
		boolean taken = currentPlanId == null ? planRepository.existsBySlug(slug)
				: planRepository.existsBySlugAndIdNot(slug, currentPlanId);
		if (taken) {
			throw SubscriptionPlanExceptions.slugTaken();
		}
		return slug;
	}

	/** "Premium Plus" becomes "premium-plus", then "premium-plus-2" for the next plan with that title. */
	private String generateSlug(String title) {
		String base = Slugs.slugify(title, SLUG_BASE_MAX_LENGTH);
		if (base.isEmpty()) {
			base = FALLBACK_SLUG;
		}
		if (!planRepository.existsBySlug(base)) {
			return base;
		}
		for (int n = 2; n < 2 + MAX_NUMBERED_SLUGS; n++) {
			String candidate = base + "-" + n;
			if (!planRepository.existsBySlug(candidate)) {
				return candidate;
			}
		}
		// Dozens of plans with one title: the admin has to choose a slug.
		throw SubscriptionPlanExceptions.slugTaken();
	}

	/** Rules spanning fields or beyond Bean Validation, checked on the plan after all changes. */
	private static void validateRules(SubscriptionPlan plan) {
		try {
			Currency.getInstance(plan.getCurrency());
		}
		catch (IllegalArgumentException ex) {
			throw new FieldValidationException("currency", "must be a valid ISO 4217 currency code");
		}
		if (plan.getBillingInterval() == BillingInterval.LIFETIME && plan.getBillingIntervalCount() != 1) {
			throw new FieldValidationException("billingIntervalCount", "must be 1 for lifetime plans");
		}
	}

	/** Trims entries and rejects duplicates (ignoring case) instead of silently dropping them. */
	private static List<String> normalizeFeatures(List<String> features) {
		List<String> normalized = features.stream().map(String::strip).toList();
		Set<String> seen = new HashSet<>();
		for (String feature : normalized) {
			if (!seen.add(feature.toLowerCase(Locale.ROOT))) {
				throw new FieldValidationException("features", "must not contain duplicates");
			}
		}
		return new ArrayList<>(normalized);
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
		return requested.and(Sort.by(Sort.Direction.DESC, "id"));
	}

	private static Specification<SubscriptionPlan> matching(SubscriptionPlanFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				// Slugs are always lowercase.
				predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
						cb.like(root.get("slug"), pattern, '\\')));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), SubscriptionPlanStatus.fromValue(filter.status())));
			}
			if (filter.billingInterval() != null) {
				predicates.add(cb.equal(root.get("billingInterval"), BillingInterval.fromValue(filter.billingInterval())));
			}
			if (filter.popular() != null) {
				predicates.add(cb.equal(root.get("popular"), filter.popular()));
			}
			if (filter.minPrice() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("price"), filter.minPrice()));
			}
			if (filter.maxPrice() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("price"), filter.maxPrice()));
			}
			if (filter.createdFrom() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"), filter.createdFrom()));
			}
			if (filter.createdTo() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.<Instant>get("createdAt"), filter.createdTo()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
