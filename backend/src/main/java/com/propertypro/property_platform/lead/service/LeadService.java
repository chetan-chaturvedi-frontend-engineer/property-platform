package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.lead.domain.Facing;
import com.propertypro.property_platform.lead.domain.Furnishing;
import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadPriority;
import com.propertypro.property_platform.lead.domain.LeadPropertyType;
import com.propertypro.property_platform.lead.domain.LeadPurpose;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import com.propertypro.property_platform.lead.domain.ParkingPreference;
import com.propertypro.property_platform.lead.domain.PossessionTimeline;
import com.propertypro.property_platform.lead.dto.AssignLeadRequest;
import com.propertypro.property_platform.lead.dto.CreateLeadRequest;
import com.propertypro.property_platform.lead.dto.LeadFilter;
import com.propertypro.property_platform.lead.dto.LeadResponse;
import com.propertypro.property_platform.lead.dto.LeadStatsResponse;
import com.propertypro.property_platform.lead.dto.LeadSummaryResponse;
import com.propertypro.property_platform.lead.dto.UpdateLeadRequest;
import com.propertypro.property_platform.lead.exception.LeadExceptions;
import com.propertypro.property_platform.lead.mapper.LeadResponseMapper;
import com.propertypro.property_platform.lead.repository.LeadRepository;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.service.PropertyAmenityService;
import com.propertypro.property_platform.security.CurrentActor;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.propertypro.property_platform.security.Permissions.LEAD_ASSIGN;
import static com.propertypro.property_platform.security.Permissions.LEAD_CREATE;
import static com.propertypro.property_platform.security.Permissions.LEAD_LIST;
import static com.propertypro.property_platform.security.Permissions.LEAD_LIST_ANY;

/**
 * Lead lifecycle: creation, viewing, listing, updates, assignment and soft deletion. Authorization goes
 * through {@link LeadAccessService}; assignees are checked by {@link LeadAssigneeService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeadService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("createdAt", "updatedAt", "leadName", "status",
			"nextFollowUpAt", "lastContactedAt", "budgetMax");
	private static final int MIN_PHONE_SEARCH_DIGITS = 3;

	private final LeadRepository leadRepository;
	private final LeadAccessService access;
	private final LeadAssigneeService assignees;
	private final LeadResponseMapper mapper;
	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final PropertyAmenityService amenityService;

	@Transactional
	public LeadResponse create(CurrentActor actor, CreateLeadRequest request) {
		requirePermission(actor, LEAD_CREATE);
		Lead lead = new Lead(actor.userId(), LeadPurpose.fromValue(request.purpose()), request.leadName().strip(),
				normalizePhone(request.phone(), "phone"));
		if (request.assignedTo() != null) {
			requirePermission(actor, LEAD_ASSIGN);
			assignees.requireEligibleLeadAssignee(request.assignedTo(), actor.userId(), "assignedTo");
			lead.setAssignedTo(request.assignedTo());
		}
		lead.setAlternatePhone(request.alternatePhone() == null || request.alternatePhone().isBlank() ? null
				: normalizePhone(request.alternatePhone(), "alternatePhone"));
		lead.setEmail(normalizeEmail(request.email()));
		if (request.source() != null) {
			lead.setSource(LeadSource.fromValue(request.source()));
		}
		if (request.status() != null) {
			lead.setStatus(LeadStatus.fromValue(request.status()));
		}
		if (request.priority() != null) {
			lead.setPriority(LeadPriority.fromValue(request.priority()));
		}
		lead.setPropertyType(request.propertyType() == null ? null : LeadPropertyType.fromValue(request.propertyType()));
		lead.setBhk(request.bhk());
		lead.setBudgetMin(request.budgetMin());
		lead.setBudgetMax(request.budgetMax());
		if (request.budgetCurrency() != null) {
			lead.setBudgetCurrency(request.budgetCurrency());
		}
		lead.setArea(request.area());
		lead.setAreaUnit(request.areaUnit() == null ? null : AreaUnit.fromValue(request.areaUnit()));
		lead.setPreferredLocation(stripToNull(request.preferredLocation()));
		lead.setLocation(stripToNull(request.location()));
		lead.setPossession(request.possession() == null ? null : PossessionTimeline.fromValue(request.possession()));
		lead.setMoveInDate(request.moveInDate());
		lead.setFloorPreference(stripToNull(request.floorPreference()));
		lead.setFacing(request.facing() == null ? null : Facing.fromValue(request.facing()));
		lead.setFurnishing(request.furnishing() == null ? null : Furnishing.fromValue(request.furnishing()));
		lead.setParking(request.parking() == null ? null : ParkingPreference.fromValue(request.parking()));
		lead.setAmenities(validAmenities(request.amenities()));
		lead.setLoanRequired(Boolean.TRUE.equals(request.loanRequired()));
		lead.setAdditionalNote(stripToNull(request.additionalNote()));
		lead.setNextFollowUpAt(request.nextFollowUpAt());
		lead.setLostReason(stripToNull(request.lostReason()));
		validate(lead);
		leadRepository.saveAndFlush(lead);
		log.info("Lead created leadId={} createdBy={} assignedTo={}", lead.getId(), actor.userId(), lead.getAssignedTo());
		return mapper.toResponse(lead);
	}

	@Transactional(readOnly = true)
	public LeadResponse get(Long id, CurrentActor actor) {
		return mapper.toResponse(access.requireViewable(id, actor));
	}

	/**
	 * Every lead for holders of {@code LEAD_LIST_ANY}; otherwise the actor's own leads, which needs
	 * {@code LEAD_LIST}. The scope is part of the query, so counts and pages never include other leads.
	 */
	@Transactional(readOnly = true)
	public PageResponse<LeadSummaryResponse> list(CurrentActor actor, LeadFilter filter, Pageable pageable) {
		Specification<Lead> spec = matching(filter);
		if (!actor.has(LEAD_LIST_ANY)) {
			requirePermission(actor, LEAD_LIST);
			spec = spec.and(access.ownLeads(actor));
		}
		return page(spec, pageable);
	}

	/** Every lead; requires {@code LEAD_LIST_ANY} (checked by the controller). */
	@Transactional(readOnly = true)
	public PageResponse<LeadSummaryResponse> listAll(LeadFilter filter, Pageable pageable) {
		return page(matching(filter), pageable);
	}

	/** Counts per status and source over every lead; requires {@code LEAD_LIST_ANY} (checked by the controller). */
	@Transactional(readOnly = true)
	public LeadStatsResponse stats() {
		Map<String, Long> byStatus = new LinkedHashMap<>();
		for (LeadStatus status : LeadStatus.values()) {
			byStatus.put(status.getValue(), 0L);
		}
		Map<String, Long> bySource = new LinkedHashMap<>();
		for (LeadSource source : LeadSource.values()) {
			bySource.put(source.getValue(), 0L);
		}
		long total = 0;
		for (LeadRepository.StatusSourceCount count : leadRepository.countByStatusAndSource()) {
			total += count.getTotal();
			byStatus.merge(count.getStatus().getValue(), count.getTotal(), Long::sum);
			bySource.merge(count.getSource().getValue(), count.getTotal(), Long::sum);
		}
		return new LeadStatsResponse(total, byStatus, bySource);
	}

	@Transactional
	public LeadResponse update(Long id, CurrentActor actor, UpdateLeadRequest request) {
		Lead lead = access.requireEditable(id, actor);
		LeadStatus previousStatus = lead.getStatus();
		apply(request.getLeadName(), value -> lead.setLeadName(value.strip()));
		apply(request.getPhone(), value -> lead.setPhone(normalizePhone(value, "phone")));
		apply(request.getAlternatePhone(), value -> lead.setAlternatePhone(
				value == null || value.isBlank() ? null : normalizePhone(value, "alternatePhone")));
		apply(request.getEmail(), value -> lead.setEmail(normalizeEmail(value)));
		apply(request.getSource(), value -> lead.setSource(LeadSource.fromValue(value)));
		apply(request.getStatus(), value -> lead.setStatus(LeadStatus.fromValue(value)));
		apply(request.getPriority(), value -> lead.setPriority(LeadPriority.fromValue(value)));
		apply(request.getPurpose(), value -> lead.setPurpose(LeadPurpose.fromValue(value)));
		apply(request.getPropertyType(), value -> lead.setPropertyType(
				value == null ? null : LeadPropertyType.fromValue(value)));
		apply(request.getBhk(), lead::setBhk);
		apply(request.getBudgetMin(), lead::setBudgetMin);
		apply(request.getBudgetMax(), lead::setBudgetMax);
		apply(request.getBudgetCurrency(), lead::setBudgetCurrency);
		apply(request.getArea(), lead::setArea);
		apply(request.getAreaUnit(), value -> lead.setAreaUnit(value == null ? null : AreaUnit.fromValue(value)));
		apply(request.getPreferredLocation(), value -> lead.setPreferredLocation(stripToNull(value)));
		apply(request.getLocation(), value -> lead.setLocation(stripToNull(value)));
		apply(request.getPossession(), value -> lead.setPossession(
				value == null ? null : PossessionTimeline.fromValue(value)));
		apply(request.getMoveInDate(), lead::setMoveInDate);
		apply(request.getFloorPreference(), value -> lead.setFloorPreference(stripToNull(value)));
		apply(request.getFacing(), value -> lead.setFacing(value == null ? null : Facing.fromValue(value)));
		apply(request.getFurnishing(), value -> lead.setFurnishing(value == null ? null : Furnishing.fromValue(value)));
		apply(request.getParking(), value -> lead.setParking(value == null ? null : ParkingPreference.fromValue(value)));
		apply(request.getAmenities(), value -> lead.setAmenities(validAmenities(value)));
		apply(request.getLoanRequired(), lead::setLoanRequired);
		apply(request.getAdditionalNote(), value -> lead.setAdditionalNote(stripToNull(value)));
		apply(request.getNextFollowUpAt(), lead::setNextFollowUpAt);
		apply(request.getLostReason(), value -> lead.setLostReason(stripToNull(value)));
		if (!previousStatus.canChangeTo(lead.getStatus())) {
			throw LeadExceptions.invalidStatusTransition(previousStatus, lead.getStatus());
		}
		if (lead.getStatus() != LeadStatus.LOST) {
			// The reason belongs to the lost status; a reopened lead keeps its history in interactions.
			lead.setLostReason(null);
		}
		validate(lead);
		leadRepository.flush();
		if (previousStatus != lead.getStatus()) {
			log.info("Lead status changed leadId={} by={} from={} to={}", lead.getId(), actor.userId(),
					previousStatus.getValue(), lead.getStatus().getValue());
		}
		return mapper.toResponse(lead);
	}

	/** Sets or clears the assignee; requires {@code LEAD_ASSIGN} and a lead the actor can see. */
	@Transactional
	public LeadResponse assign(Long id, CurrentActor actor, AssignLeadRequest request) {
		requirePermission(actor, LEAD_ASSIGN);
		Lead lead = access.lockVisible(id, actor);
		if (request.assignedTo() != null) {
			assignees.requireEligibleLeadAssignee(request.assignedTo(), lead.getCreatedBy(), "assignedTo");
		}
		Long previous = lead.getAssignedTo();
		lead.setAssignedTo(request.assignedTo());
		leadRepository.flush();
		log.info("Lead assigned leadId={} by={} from={} to={}", lead.getId(), actor.userId(), previous,
				lead.getAssignedTo());
		return mapper.toResponse(lead);
	}

	/** Soft delete; schedules and interactions are kept and disappear with the lead. */
	@Transactional
	public void delete(Long id, CurrentActor actor) {
		Lead lead = access.requireDeletable(id, actor);
		leadRepository.delete(lead);
		leadRepository.flush();
		log.info("Lead deleted leadId={} by={}", id, actor.userId());
	}

	private PageResponse<LeadSummaryResponse> page(Specification<Lead> spec, Pageable pageable) {
		Page<Lead> page = leadRepository.findAll(spec, LeadPaging.of(pageable, SORTABLE_FIELDS));
		Function<Lead, LeadSummaryResponse> mapping = mapper.summaries(page.getContent());
		return PageResponse.of(page, mapping);
	}

	static Specification<Lead> matching(LeadFilter filter) {
		requireOrdered(filter.createdFrom(), filter.createdTo(), "createdTo");
		requireOrdered(filter.nextFollowUpFrom(), filter.nextFollowUpTo(), "nextFollowUpTo");
		if (filter.budgetMin() != null && filter.budgetMax() != null
				&& filter.budgetMax().compareTo(filter.budgetMin()) < 0) {
			throw new FieldValidationException("budgetMax", "must not be less than budgetMin");
		}
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String term = filter.search().strip().toLowerCase(Locale.ROOT);
				String pattern = "%" + LeadPaging.escapeLike(term) + "%";
				List<Predicate> any = new ArrayList<>(List.of(cb.like(cb.lower(root.get("leadName")), pattern, '\\'),
						cb.like(cb.lower(root.get("email")), pattern, '\\')));
				String digits = term.replaceAll("\\D", "");
				if (digits.length() >= MIN_PHONE_SEARCH_DIGITS) {
					String phonePattern = "%" + digits + "%";
					any.add(cb.like(root.get("phone"), phonePattern));
					any.add(cb.like(root.get("alternatePhone"), phonePattern));
				}
				predicates.add(cb.or(any.toArray(Predicate[]::new)));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), LeadStatus.fromValue(filter.status())));
			}
			if (filter.priority() != null) {
				predicates.add(cb.equal(root.get("priority"), LeadPriority.fromValue(filter.priority())));
			}
			if (filter.source() != null) {
				predicates.add(cb.equal(root.get("source"), LeadSource.fromValue(filter.source())));
			}
			if (filter.purpose() != null) {
				predicates.add(cb.equal(root.get("purpose"), LeadPurpose.fromValue(filter.purpose())));
			}
			if (filter.propertyType() != null) {
				predicates.add(cb.equal(root.get("propertyType"), LeadPropertyType.fromValue(filter.propertyType())));
			}
			if (filter.assignedTo() != null) {
				predicates.add(cb.equal(root.get("assignedTo"), filter.assignedTo()));
			}
			if (filter.createdBy() != null) {
				predicates.add(cb.equal(root.get("createdBy"), filter.createdBy()));
			}
			if (filter.preferredLocation() != null && !filter.preferredLocation().isBlank()) {
				String pattern = "%" + LeadPaging.escapeLike(filter.preferredLocation().strip().toLowerCase(Locale.ROOT))
						+ "%";
				predicates.add(cb.like(cb.lower(root.get("preferredLocation")), pattern, '\\'));
			}
			// Budget ranges overlap; a lead with only one bound uses it for both ends.
			Expression<BigDecimal> leadMax = cb.coalesce(root.get("budgetMax"), root.get("budgetMin"));
			Expression<BigDecimal> leadMin = cb.coalesce(root.get("budgetMin"), root.get("budgetMax"));
			if (filter.budgetMin() != null) {
				predicates.add(cb.greaterThanOrEqualTo(leadMax, filter.budgetMin()));
			}
			if (filter.budgetMax() != null) {
				predicates.add(cb.lessThanOrEqualTo(leadMin, filter.budgetMax()));
			}
			range(predicates, cb, root.get("createdAt"), filter.createdFrom(), filter.createdTo());
			range(predicates, cb, root.get("nextFollowUpAt"), filter.nextFollowUpFrom(), filter.nextFollowUpTo());
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static void range(List<Predicate> predicates, CriteriaBuilder cb,
			Expression<Instant> path, Instant from, Instant to) {
		if (from != null) {
			predicates.add(cb.greaterThanOrEqualTo(path, from));
		}
		if (to != null) {
			predicates.add(cb.lessThanOrEqualTo(path, to));
		}
	}

	private static void requireOrdered(Instant from, Instant to, String field) {
		if (from != null && to != null && to.isBefore(from)) {
			throw new FieldValidationException(field, "must not be before the start of the range");
		}
	}

	/** Cross-field rules, checked after all fields are applied. */
	private static void validate(Lead lead) {
		if (lead.getBudgetMin() != null && lead.getBudgetMax() != null
				&& lead.getBudgetMax().compareTo(lead.getBudgetMin()) < 0) {
			throw new FieldValidationException("budgetMax", "must not be less than budgetMin");
		}
		if (lead.getArea() != null && lead.getAreaUnit() == null) {
			throw new FieldValidationException("areaUnit", "is required when area is set");
		}
		if (lead.getStatus() == LeadStatus.LOST && lead.getLostReason() == null) {
			throw new FieldValidationException("lostReason", "is required when status is lost");
		}
	}

	/** Distinct slugs of active catalog amenities, in the given order; {@code null} stays null. */
	private List<String> validAmenities(List<String> requested) {
		if (requested == null) {
			return null;
		}
		Set<String> known = amenityService.catalog().stream().map(AmenityResponse::slug).collect(Collectors.toSet());
		Set<String> slugs = new LinkedHashSet<>();
		for (String value : requested) {
			String slug = value.strip().toLowerCase(Locale.ROOT);
			if (!known.contains(slug)) {
				throw new FieldValidationException("amenities", "contains an unknown amenity: " + slug);
			}
			slugs.add(slug);
		}
		return new ArrayList<>(slugs);
	}

	private String normalizePhone(String phone, String field) {
		return phoneNumberNormalizer.normalize(phone)
			.orElseThrow(() -> new FieldValidationException(field, "must be a valid phone number"));
	}

	private static String normalizeEmail(String email) {
		return email == null || email.isBlank() ? null : email.strip().toLowerCase(Locale.ROOT);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw LeadExceptions.actionForbidden();
		}
	}

	/** PATCH field: {@code null} = omitted (skip); otherwise set the value, or null for an explicit JSON null. */
	static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

	static String stripToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

}
