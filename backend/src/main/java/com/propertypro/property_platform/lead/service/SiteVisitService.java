package com.propertypro.property_platform.lead.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.domain.SiteVisitInterest;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import com.propertypro.property_platform.lead.domain.SiteVisitType;
import com.propertypro.property_platform.lead.dto.AdminCreateSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.AssignSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.CreateSiteVisitRequest;
import com.propertypro.property_platform.lead.dto.MySiteVisitFilter;
import com.propertypro.property_platform.lead.dto.SiteVisitFilter;
import com.propertypro.property_platform.lead.dto.SiteVisitReportRequest;
import com.propertypro.property_platform.lead.dto.SiteVisitResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitStatsResponse;
import com.propertypro.property_platform.lead.dto.SiteVisitStatusRequest;
import com.propertypro.property_platform.lead.dto.SiteVisitSummaryResponse;
import com.propertypro.property_platform.lead.dto.UpdateSiteVisitRequest;
import com.propertypro.property_platform.lead.event.SiteVisitBookedEvent;
import com.propertypro.property_platform.lead.exception.SiteVisitExceptions;
import com.propertypro.property_platform.lead.mapper.SiteVisitResponseMapper;
import com.propertypro.property_platform.lead.repository.SiteVisitRepository;
import com.propertypro.property_platform.lead.service.SiteVisitAccessService.Access;
import com.propertypro.property_platform.lead.service.SiteVisitAccessService.Relation;
import com.propertypro.property_platform.property.dto.PropertyReference;
import com.propertypro.property_platform.property.service.PropertyReferenceService;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.user.service.UserAccountService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.propertypro.property_platform.lead.service.LeadService.apply;
import static com.propertypro.property_platform.lead.service.LeadService.stripToNull;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ACCESS_ASSIGNED;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ASSIGN;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_ASSIGN_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_CREATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_CREATE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_LIST;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_SUBMIT_REPORT;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_SUBMIT_REPORT_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_STATUS;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_UPDATE_STATUS_ANY;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_VIEW;
import static com.propertypro.property_platform.security.Permissions.SITE_VISIT_VIEW_ANY;

/**
 * Site visit lifecycle for the app and the admin dashboard: booking, viewing, listing, edits,
 * assignment, status changes, the visit report and soft deletion. Every method takes {@code admin}
 * (or exists in an admin variant): admin calls need the {@code _ANY} permission and work on any visit;
 * app calls need the own permission and a relation to the visit (see {@link SiteVisitAccessService}).
 * <p>
 * Edits are limited per relation by the field allow-lists below, never by trusting the request:
 * builder, property, scheduler and report submitter are always taken from the database or the token.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SiteVisitService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("visitDate", "createdAt", "updatedAt", "nextFollowUp",
			"status");
	private static final int MIN_PHONE_SEARCH_DIGITS = 3;
	private static final String DUPLICATE_BOOKING_INDEX = "uq_site_visits_active_booking";
	private static final String ASSIGNEE_NOT_ELIGIBLE = "must be the builder or an active user who can work on assigned site visits";

	/** Fields that describe the visit itself; they change only while it is upcoming. */
	static final Set<String> SCHEDULE_FIELDS = Set.of("visitType", "visitDate", "visitTime", "name", "mobile",
			"email", "numberOfPeople", "note", "userId");
	/** The builder manages the booking and the follow-up, but not who the visitor is. */
	static final Set<String> BUILDER_FIELDS = Set.of("visitType", "visitDate", "visitTime", "name", "mobile",
			"email", "numberOfPeople", "note", "nextFollowUp", "followUpNote");
	/** The assignee coordinates the visit: when it happens, group size, notes and the follow-up. */
	static final Set<String> ASSIGNEE_FIELDS = Set.of("visitDate", "visitTime", "numberOfPeople", "note",
			"nextFollowUp", "followUpNote");
	/** Admins may also correct the visitor's account and the lead link. */
	static final Set<String> ADMIN_FIELDS = Set.of("visitType", "visitDate", "visitTime", "name", "mobile", "email",
			"numberOfPeople", "note", "nextFollowUp", "followUpNote", "userId", "leadId");

	private final SiteVisitRepository repository;
	private final SiteVisitAccessService access;
	private final SiteVisitResponseMapper mapper;
	private final PropertyReferenceService propertyReferenceService;
	private final UserAccountService userAccountService;
	private final RolePermissionService rolePermissionService;
	private final LeadAccessService leadAccessService;
	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final SiteVisitProperties properties;
	private final Clock clock;
	private final ApplicationEventPublisher events;

	/**
	 * App booking. A published property books the caller as visitor; the caller's own property (any
	 * status) records a visit without a visitor account, e.g. a walk-in. Other properties are rejected
	 * with the same message whether or not they exist.
	 */
	@Transactional
	public SiteVisitResponse create(CurrentActor actor, CreateSiteVisitRequest request) {
		requirePermission(actor, SITE_VISIT_CREATE);
		PropertyReference property = propertyReferenceService.findActive(request.propertyId())
			.filter(found -> found.isPublished() || found.ownerId().equals(actor.userId()))
			.orElseThrow(() -> new FieldValidationException("propertyId", "must be a published property"));
		boolean ownProperty = property.ownerId().equals(actor.userId());
		SiteVisit visit = newVisit(property, actor, request.visitDate(), request.visitTime(), request.name(),
				request.mobile());
		visit.setUserId(ownProperty ? null : actor.userId());
		applyBookingDetails(visit, request.visitType(), request.email(), request.numberOfPeople(), request.note());
		save(visit);
		log.info("Site visit booked visitId={} propertyId={} by={} builderId={}", visit.getId(), property.id(),
				actor.userId(), property.ownerId());
		SiteVisitResponse response = mapper.toResponse(visit, ownProperty);
		if (!ownProperty) {
			events.publishEvent(new SiteVisitBookedEvent(visit.getId(), response.visitCode(), property.id(),
					property.projectName(), property.ownerId(), actor.userId(), visit.getName(), visit.getVisitDate(),
					visit.getVisitTime()));
		}
		return response;
	}

	/** Admin creation for any property that is not deleted; requires {@code SITE_VISIT_CREATE_ANY}. */
	@Transactional
	public SiteVisitResponse createAsAdmin(CurrentActor actor, AdminCreateSiteVisitRequest request) {
		requirePermission(actor, SITE_VISIT_CREATE_ANY);
		PropertyReference property = propertyReferenceService.findActive(request.propertyId())
			.orElseThrow(() -> new FieldValidationException("propertyId", "must be an existing property"));
		SiteVisit visit = newVisit(property, actor, request.visitDate(), request.visitTime(), request.name(),
				request.mobile());
		if (request.userId() != null) {
			requireActiveUser(request.userId(), "userId");
			visit.setUserId(request.userId());
		}
		if (request.assignId() != null) {
			requirePermission(actor, SITE_VISIT_ASSIGN_ANY);
			requireEligibleAssignee(request.assignId(), visit.getBuilderId());
			visit.assign(request.assignId(), clock.instant());
		}
		if (request.leadId() != null) {
			requireViewableLead(request.leadId(), actor);
			visit.setLeadId(request.leadId());
		}
		applyBookingDetails(visit, request.visitType(), request.email(), request.numberOfPeople(), request.note());
		visit.setNextFollowUp(request.nextFollowUp());
		visit.setFollowUpNote(stripToNull(request.followUpNote()));
		save(visit);
		log.info("Site visit created visitId={} propertyId={} by={} assignId={}", visit.getId(), property.id(),
				actor.userId(), visit.getAssignId());
		return mapper.toResponse(visit, true);
	}

	@Transactional(readOnly = true)
	public SiteVisitResponse get(Long id, CurrentActor actor, boolean admin) {
		Access found = admin ? access.requireAny(id, actor) : access.requireOwn(id, actor);
		requirePermission(actor, admin ? SITE_VISIT_VIEW_ANY : SITE_VISIT_VIEW);
		return mapper.toResponse(found.visit(), found.internal());
	}

	/**
	 * The actor's own visits (builder, visitor or assignee); requires {@code SITE_VISIT_LIST}. The scope
	 * is part of the query, so counts and pages never include other visits.
	 */
	@Transactional(readOnly = true)
	public PageResponse<SiteVisitSummaryResponse> listOwn(CurrentActor actor, MySiteVisitFilter filter,
			Pageable pageable) {
		requirePermission(actor, SITE_VISIT_LIST);
		Relation only = filter.relation() == null ? null : Relation.valueOf(filter.relation().toUpperCase(Locale.ROOT));
		Specification<SiteVisit> spec = matching(filter).and(access.ownVisits(actor, only));
		Page<SiteVisit> page = repository.findAll(spec, paging(pageable));
		return PageResponse.of(page, mapper.summaries(page.getContent(), visit -> {
			Set<Relation> relations = SiteVisitAccessService.relations(visit, actor);
			return relations.contains(Relation.BUILDER) || relations.contains(Relation.ASSIGNEE);
		}));
	}

	/** Every visit; requires {@code SITE_VISIT_LIST_ANY}. */
	@Transactional(readOnly = true)
	public PageResponse<SiteVisitSummaryResponse> listAll(CurrentActor actor, SiteVisitFilter filter,
			Pageable pageable) {
		requirePermission(actor, SITE_VISIT_LIST_ANY);
		Page<SiteVisit> page = repository.findAll(matching(filter), paging(pageable));
		return PageResponse.of(page, mapper.summaries(page.getContent(), visit -> true));
	}

	/** Counts of every visit per status and visit type; requires {@code SITE_VISIT_LIST_ANY}. */
	@Transactional(readOnly = true)
	public SiteVisitStatsResponse stats(CurrentActor actor) {
		requirePermission(actor, SITE_VISIT_LIST_ANY);
		Map<String, Long> byStatus = new LinkedHashMap<>();
		for (SiteVisitStatus status : SiteVisitStatus.values()) {
			byStatus.put(status.getValue(), 0L);
		}
		Map<String, Long> byVisitType = new LinkedHashMap<>();
		for (SiteVisitType type : SiteVisitType.values()) {
			byVisitType.put(type.getValue(), 0L);
		}
		long total = 0;
		for (SiteVisitRepository.StatusTypeCount count : repository.countByStatusAndVisitType()) {
			total += count.getTotal();
			byStatus.merge(count.getStatus().getValue(), count.getTotal(), Long::sum);
			byVisitType.merge(count.getVisitType().getValue(), count.getTotal(), Long::sum);
		}
		return new SiteVisitStatsResponse(total, byStatus, byVisitType);
	}

	/**
	 * Partial update limited to the fields the actor's relation allows ({@link #BUILDER_FIELDS},
	 * {@link #ASSIGNEE_FIELDS}, or {@link #ADMIN_FIELDS} for admin calls); a visitor cannot edit. Any
	 * other field fails the whole request with 403 before anything changes. Moving the date or time of
	 * an upcoming visit makes it rescheduled.
	 */
	@Transactional
	public SiteVisitResponse update(Long id, CurrentActor actor, UpdateSiteVisitRequest request, boolean admin) {
		Access found = lockForAction(id, actor, admin, SITE_VISIT_UPDATE, SITE_VISIT_UPDATE_ANY);
		Set<String> allowed = new LinkedHashSet<>();
		if (admin) {
			allowed.addAll(ADMIN_FIELDS);
		}
		else {
			if (found.is(Relation.BUILDER)) {
				allowed.addAll(BUILDER_FIELDS);
			}
			if (found.is(Relation.ASSIGNEE)) {
				allowed.addAll(ASSIGNEE_FIELDS);
			}
			if (allowed.isEmpty()) {
				throw SiteVisitExceptions.actionForbidden();
			}
		}
		Set<String> present = request.presentFields();
		Set<String> forbidden = new LinkedHashSet<>(present);
		forbidden.removeAll(allowed);
		if (!forbidden.isEmpty()) {
			throw SiteVisitExceptions.fieldsForbidden(forbidden);
		}
		SiteVisit visit = found.visit();
		if (present.stream().anyMatch(SCHEDULE_FIELDS::contains) && !visit.getStatus().isUpcoming()) {
			throw SiteVisitExceptions.notEditable(visit.getStatus());
		}

		LocalDate date = request.getVisitDate() == null ? visit.getVisitDate() : request.getVisitDate().orElseThrow();
		LocalTime time = request.getVisitTime() == null ? visit.getVisitTime() : request.getVisitTime().orElseThrow();
		if (!date.equals(visit.getVisitDate()) || !time.equals(visit.getVisitTime())) {
			requireBookableSlot(date, time);
			visit.schedule(date, time);
		}
		apply(request.getVisitType(), value -> visit.setVisitType(SiteVisitType.fromValue(value)));
		apply(request.getName(), value -> visit.setName(value.strip()));
		apply(request.getMobile(), value -> visit.setMobile(normalizeMobile(value)));
		apply(request.getEmail(), value -> visit.setEmail(normalizeEmail(value)));
		apply(request.getNumberOfPeople(), value -> visit.setNumberOfPeople(value.shortValue()));
		apply(request.getNote(), value -> visit.setNote(stripToNull(value)));
		apply(request.getNextFollowUp(), visit::setNextFollowUp);
		apply(request.getFollowUpNote(), value -> visit.setFollowUpNote(stripToNull(value)));
		apply(request.getUserId(), value -> {
			if (value != null) {
				requireActiveUser(value, "userId");
			}
			visit.setUserId(value);
		});
		apply(request.getLeadId(), value -> {
			if (value != null) {
				requireViewableLead(value, actor);
			}
			visit.setLeadId(value);
		});
		save(visit);
		log.info("Site visit updated visitId={} by={} fields={}", visit.getId(), actor.userId(), present);
		return mapper.toResponse(visit, found.internal());
	}

	/**
	 * Sets or clears the assignee. In the app only the builder assigns ({@code SITE_VISIT_ASSIGN});
	 * admins need {@code SITE_VISIT_ASSIGN_ANY}. Cancelled and no-show visits keep their assignee.
	 */
	@Transactional
	public SiteVisitResponse assign(Long id, CurrentActor actor, AssignSiteVisitRequest request, boolean admin) {
		Access found = lockForAction(id, actor, admin, SITE_VISIT_ASSIGN, SITE_VISIT_ASSIGN_ANY);
		if (!admin && !found.is(Relation.BUILDER)) {
			throw SiteVisitExceptions.actionForbidden();
		}
		SiteVisit visit = found.visit();
		if (!visit.getStatus().isUpcoming() && visit.getStatus() != SiteVisitStatus.COMPLETED) {
			throw SiteVisitExceptions.notEditable(visit.getStatus());
		}
		if (request.assignId() != null) {
			requireEligibleAssignee(request.assignId(), visit.getBuilderId());
		}
		Long previous = visit.getAssignId();
		visit.assign(request.assignId(), clock.instant());
		repository.flush();
		log.info("Site visit assigned visitId={} by={} from={} to={}", visit.getId(), actor.userId(), previous,
				visit.getAssignId());
		return mapper.toResponse(visit, found.internal());
	}

	/**
	 * Moves an upcoming visit to confirmed, completed, cancelled or no-show (see
	 * {@link SiteVisitStatus#canChangeTo}). In the app the builder and the assignee may request any of
	 * them, the visitor only a cancellation. Completed and no-show need the visit date to have come.
	 */
	@Transactional
	public SiteVisitResponse changeStatus(Long id, CurrentActor actor, SiteVisitStatusRequest request, boolean admin) {
		Access found = lockForAction(id, actor, admin, SITE_VISIT_UPDATE_STATUS, SITE_VISIT_UPDATE_STATUS_ANY);
		SiteVisitStatus next = SiteVisitStatus.fromValue(request.status());
		if (!admin && !found.is(Relation.BUILDER) && !found.is(Relation.ASSIGNEE) && next != SiteVisitStatus.CANCELLED) {
			throw SiteVisitExceptions.actionForbidden();
		}
		SiteVisit visit = found.visit();
		SiteVisitStatus previous = visit.getStatus();
		if (!previous.canChangeTo(next)) {
			throw SiteVisitExceptions.invalidStatusTransition(previous, next);
		}
		if (request.actualVisitDate() != null && next != SiteVisitStatus.COMPLETED) {
			throw new FieldValidationException("actualVisitDate", "is only allowed when completing a visit");
		}
		String reason = stripToNull(request.cancellationReason());
		if (next == SiteVisitStatus.CANCELLED && reason == null) {
			throw new FieldValidationException("cancellationReason", "is required when cancelling a visit");
		}
		if (next != SiteVisitStatus.CANCELLED && reason != null) {
			throw new FieldValidationException("cancellationReason", "is only allowed when cancelling a visit");
		}
		Instant now = clock.instant();
		switch (next) {
			case CONFIRMED -> visit.confirm();
			case CANCELLED -> visit.cancel(now, reason);
			case NO_SHOW -> {
				requireDue(visit);
				visit.markNoShow();
			}
			case COMPLETED -> {
				requireDue(visit);
				Instant actual = request.actualVisitDate() == null ? now : request.actualVisitDate();
				if (actual.isAfter(now)) {
					throw new FieldValidationException("actualVisitDate", "must not be in the future");
				}
				visit.complete(actual);
			}
			default -> throw SiteVisitExceptions.invalidStatusTransition(previous, next);
		}
		repository.flush();
		log.info("Site visit status changed visitId={} by={} from={} to={}", visit.getId(), actor.userId(),
				previous.getValue(), next.getValue());
		return mapper.toResponse(visit, found.internal());
	}

	/**
	 * Submits the report of a completed visit; the submitter is the actor. In the app the builder or the
	 * assignee submits it once; replacing a submitted report needs {@code SITE_VISIT_SUBMIT_REPORT_ANY}.
	 */
	@Transactional
	public SiteVisitResponse submitReport(Long id, CurrentActor actor, SiteVisitReportRequest request, boolean admin) {
		Access found = lockForAction(id, actor, admin, SITE_VISIT_SUBMIT_REPORT, SITE_VISIT_SUBMIT_REPORT_ANY);
		if (!admin && !found.is(Relation.BUILDER) && !found.is(Relation.ASSIGNEE)) {
			throw SiteVisitExceptions.actionForbidden();
		}
		SiteVisit visit = found.visit();
		if (visit.getStatus() != SiteVisitStatus.COMPLETED) {
			throw SiteVisitExceptions.reportNotAllowed(visit.getStatus());
		}
		if (visit.hasReport() && !admin) {
			throw SiteVisitExceptions.reportLocked();
		}
		if (request.nextFollowUp() != null && !request.nextFollowUp().isAfter(visit.getActualVisitDate())) {
			throw new FieldValidationException("nextFollowUp", "must be after the visit took place");
		}
		visit.submitReport(SiteVisitInterest.fromValue(request.interest()), stripToNull(request.visitNote()),
				request.duration(), stripToNull(request.visitedWith()), stripToNull(request.feedback()),
				request.rating() == null ? null : request.rating().shortValue(), actor.userId());
		visit.setNextFollowUp(request.nextFollowUp());
		visit.setFollowUpNote(stripToNull(request.followUpNote()));
		repository.flush();
		log.info("Site visit report submitted visitId={} by={}", visit.getId(), actor.userId());
		return mapper.toResponse(visit, found.internal());
	}

	/** Soft delete; requires {@code SITE_VISIT_DELETE_ANY}. Deleted visits disappear from every endpoint. */
	@Transactional
	public void delete(Long id, CurrentActor actor) {
		SiteVisit visit = lockForAction(id, actor, true, SITE_VISIT_DELETE_ANY, SITE_VISIT_DELETE_ANY).visit();
		repository.delete(visit);
		repository.flush();
		log.info("Site visit deleted visitId={} by={}", id, actor.userId());
	}

	private Access lockForAction(Long id, CurrentActor actor, boolean admin, String own, String any) {
		if (admin) {
			requirePermission(actor, any);
			return access.lockAny(id, actor);
		}
		Access found = access.lockOwn(id, actor);
		requirePermission(actor, own);
		return found;
	}

	private SiteVisit newVisit(PropertyReference property, CurrentActor actor, LocalDate date, LocalTime time,
			String name, String mobile) {
		requireBookableSlot(date, time);
		return new SiteVisit(property.id(), property.ownerId(), actor.userId(), date, time, name.strip(),
				normalizeMobile(mobile));
	}

	private void applyBookingDetails(SiteVisit visit, String visitType, String email, Integer numberOfPeople,
			String note) {
		if (visitType != null) {
			visit.setVisitType(SiteVisitType.fromValue(visitType));
		}
		visit.setEmail(normalizeEmail(email));
		if (numberOfPeople != null) {
			visit.setNumberOfPeople(numberOfPeople.shortValue());
		}
		visit.setNote(stripToNull(note));
	}

	/**
	 * Saves and flushes, turning a clash with another upcoming booking of the same visitor, property and
	 * slot into 409. Checked first for a clear error; the unique index catches concurrent requests.
	 */
	private void save(SiteVisit visit) {
		if (visit.getUserId() != null && visit.getStatus().isUpcoming()
				&& repository.existsByUserIdAndPropertyIdAndVisitDateAndVisitTimeAndStatusInAndIdNot(visit.getUserId(),
						visit.getPropertyId(), visit.getVisitDate(), visit.getVisitTime(),
						EnumSet.of(SiteVisitStatus.SCHEDULED, SiteVisitStatus.CONFIRMED, SiteVisitStatus.RESCHEDULED),
						visit.getId() == null ? 0L : visit.getId())) {
			throw SiteVisitExceptions.duplicateBooking();
		}
		try {
			repository.saveAndFlush(visit);
		}
		catch (DataIntegrityViolationException ex) {
			String cause = ex.getMostSpecificCause().getMessage();
			if (cause != null && cause.contains(DUPLICATE_BOOKING_INDEX)) {
				throw SiteVisitExceptions.duplicateBooking();
			}
			throw ex;
		}
	}

	/** Today or later in the property's time zone, not already past, and within the booking window. */
	private void requireBookableSlot(LocalDate date, LocalTime time) {
		ZonedDateTime now = ZonedDateTime.now(clock.withZone(properties.timeZone()));
		LocalDate today = now.toLocalDate();
		if (date.isBefore(today)) {
			throw new FieldValidationException("visitDate", "must be today or later");
		}
		if (date.isAfter(today.plusDays(properties.maxAdvanceDays()))) {
			throw new FieldValidationException("visitDate",
					"must be within " + properties.maxAdvanceDays() + " days from today");
		}
		if (date.equals(today) && time.isBefore(now.toLocalTime())) {
			throw new FieldValidationException("visitTime", "must not be in the past");
		}
	}

	/** The visit date has come in the property's time zone. */
	private void requireDue(SiteVisit visit) {
		if (visit.getVisitDate().isAfter(LocalDate.now(clock.withZone(properties.timeZone())))) {
			throw SiteVisitExceptions.notDueYet();
		}
	}

	private void requireActiveUser(Long userId, String field) {
		boolean active = userAccountService.findAccountState(userId)
			.map(UserAccountService.AccountState::isActive)
			.orElse(false);
		if (!active) {
			throw new FieldValidationException(field, "must be an active user");
		}
	}

	/**
	 * The visit's builder, or a user who can work on visits assigned to them (or on every visit). Never
	 * an arbitrary account, so visitor details are not pushed to unrelated users. Unknown, deleted and
	 * ineligible users get the same message.
	 */
	private void requireEligibleAssignee(Long userId, Long builderId) {
		boolean active = userAccountService.findAccountState(userId)
			.map(UserAccountService.AccountState::isActive)
			.orElse(false);
		Set<String> permissions = active ? rolePermissionService.permissionsOfUser(userId) : Set.of();
		boolean eligible = active && (Objects.equals(userId, builderId) || permissions.contains(SITE_VISIT_VIEW_ANY)
				|| (permissions.contains(SITE_VISIT_ACCESS_ASSIGNED) && permissions.contains(SITE_VISIT_VIEW)));
		if (!eligible) {
			throw new FieldValidationException("assignId", ASSIGNEE_NOT_ELIGIBLE);
		}
	}

	private void requireViewableLead(Long leadId, CurrentActor actor) {
		try {
			leadAccessService.requireViewable(leadId, actor);
		}
		catch (ApiException ex) {
			throw new FieldValidationException("leadId", "must be a lead you can view");
		}
	}

	/** Allow-listed sort properties; sorting by visit date also sorts by time, then by id for stable pages. */
	private static PageRequest paging(Pageable pageable) {
		PageRequest validated = LeadPaging.of(pageable, SORTABLE_FIELDS);
		List<Sort.Order> orders = new ArrayList<>();
		for (Sort.Order order : validated.getSort()) {
			orders.add(order);
			if (order.getProperty().equals("visitDate")) {
				orders.add(new Sort.Order(order.getDirection(), "visitTime"));
			}
		}
		return validated.withSort(Sort.by(orders));
	}

	private Specification<SiteVisit> matching(MySiteVisitFilter filter) {
		requireOrdered(filter.visitDateFrom(), filter.visitDateTo(), "visitDateTo");
		LocalDate today = LocalDate.now(clock.withZone(properties.timeZone()));
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.propertyId() != null) {
				predicates.add(cb.equal(root.get("propertyId"), filter.propertyId()));
			}
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), SiteVisitStatus.fromValue(filter.status())));
			}
			if (filter.visitType() != null) {
				predicates.add(cb.equal(root.get("visitType"), SiteVisitType.fromValue(filter.visitType())));
			}
			range(predicates, cb, root.get("visitDate"), filter.visitDateFrom(), filter.visitDateTo());
			if ("upcoming".equals(filter.when())) {
				predicates.add(cb.greaterThanOrEqualTo(root.get("visitDate"), today));
			}
			else if ("past".equals(filter.when())) {
				predicates.add(cb.lessThan(root.get("visitDate"), today));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	static Specification<SiteVisit> matching(SiteVisitFilter filter) {
		requireOrdered(filter.visitDateFrom(), filter.visitDateTo(), "visitDateTo");
		if (filter.nextFollowUpFrom() != null && filter.nextFollowUpTo() != null
				&& filter.nextFollowUpTo().isBefore(filter.nextFollowUpFrom())) {
			throw new FieldValidationException("nextFollowUpTo", "must not be before the start of the range");
		}
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.search() != null && !filter.search().isBlank()) {
				String term = filter.search().strip().toLowerCase(Locale.ROOT);
				String pattern = "%" + LeadPaging.escapeLike(term) + "%";
				List<Predicate> any = new ArrayList<>(List.of(cb.like(cb.lower(root.get("name")), pattern, '\\'),
						cb.like(cb.lower(root.get("email")), pattern, '\\'),
						cb.like(cb.lower(root.get("visitCode")), pattern, '\\')));
				String digits = term.replaceAll("\\D", "");
				if (digits.length() >= MIN_PHONE_SEARCH_DIGITS) {
					any.add(cb.like(root.get("mobile"), "%" + digits + "%"));
				}
				predicates.add(cb.or(any.toArray(Predicate[]::new)));
			}
			equal(predicates, cb, root.get("propertyId"), filter.propertyId());
			equal(predicates, cb, root.get("builderId"), filter.builderId());
			equal(predicates, cb, root.get("assignId"), filter.assignId());
			equal(predicates, cb, root.get("userId"), filter.userId());
			equal(predicates, cb, root.get("leadId"), filter.leadId());
			if (filter.status() != null) {
				predicates.add(cb.equal(root.get("status"), SiteVisitStatus.fromValue(filter.status())));
			}
			if (filter.visitType() != null) {
				predicates.add(cb.equal(root.get("visitType"), SiteVisitType.fromValue(filter.visitType())));
			}
			if (filter.interest() != null) {
				predicates.add(cb.equal(root.get("interest"), SiteVisitInterest.fromValue(filter.interest())));
			}
			range(predicates, cb, root.get("visitDate"), filter.visitDateFrom(), filter.visitDateTo());
			range(predicates, cb, root.get("nextFollowUp"), filter.nextFollowUpFrom(), filter.nextFollowUpTo());
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static void equal(List<Predicate> predicates, CriteriaBuilder cb, Expression<Long> path, Long value) {
		if (value != null) {
			predicates.add(cb.equal(path, value));
		}
	}

	private static <T extends Comparable<? super T>> void range(List<Predicate> predicates, CriteriaBuilder cb,
			Expression<T> path, T from, T to) {
		if (from != null) {
			predicates.add(cb.greaterThanOrEqualTo(path, from));
		}
		if (to != null) {
			predicates.add(cb.lessThanOrEqualTo(path, to));
		}
	}

	private static void requireOrdered(LocalDate from, LocalDate to, String field) {
		if (from != null && to != null && to.isBefore(from)) {
			throw new FieldValidationException(field, "must not be before the start of the range");
		}
	}

	private String normalizeMobile(String mobile) {
		return phoneNumberNormalizer.normalize(mobile)
			.orElseThrow(() -> new FieldValidationException("mobile", "must be a valid phone number"));
	}

	private static String normalizeEmail(String email) {
		return email == null || email.isBlank() ? null : email.strip().toLowerCase(Locale.ROOT);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw SiteVisitExceptions.actionForbidden();
		}
	}

}
