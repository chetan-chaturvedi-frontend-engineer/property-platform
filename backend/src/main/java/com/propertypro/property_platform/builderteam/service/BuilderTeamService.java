package com.propertypro.property_platform.builderteam.service;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import com.propertypro.property_platform.builderteam.dto.AdminCreateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.dto.BuilderTeamFilter;
import com.propertypro.property_platform.builderteam.dto.BuilderTeamMemberResponse;
import com.propertypro.property_platform.builderteam.dto.CreateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.dto.MyBuilderTeamFilter;
import com.propertypro.property_platform.builderteam.dto.MyMembershipFilter;
import com.propertypro.property_platform.builderteam.dto.UpdateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.exception.BuilderTeamExceptions;
import com.propertypro.property_platform.builderteam.mapper.BuilderTeamResponseMapper;
import com.propertypro.property_platform.builderteam.mapper.BuilderTeamResponseMapper.View;
import com.propertypro.property_platform.builderteam.repository.BuilderTeamMemberRepository;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.subscription.service.SubscriptionService;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.service.UserAccountService;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_ASSIGN_ROLE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_CREATE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_CREATE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_DELETE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_DELETE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_LIST;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_LIST_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MANAGE_PERMISSIONS;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MANAGE_STATUS;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MEMBERSHIP_RESPOND;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_MEMBERSHIP_VIEW;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_UPDATE;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_UPDATE_ANY;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_VIEW;
import static com.propertypro.property_platform.security.Permissions.BUILDER_TEAM_VIEW_ANY;

/**
 * Builder team memberships for three audiences over one table:
 * <ul>
 * <li><b>Builder</b> (app): the caller's own team, {@code builder_id} = caller. Inviting a member and
 * reactivating one need a seat on the builder's subscription; changing a role or permissions needs a
 * subscription that includes team management; deactivating, revoking and removing never do, so a builder
 * can always reduce their team.</li>
 * <li><b>Employee</b> (app): the caller's own memberships, {@code employee_id} = caller; accept or reject
 * pending invitations.</li>
 * <li><b>Admin</b>: every team with {@code _ANY} permissions, without subscription gating.</li>
 * </ul>
 * Memberships outside the caller's scope are 404. Builder, employee and inviter are fixed at creation and
 * always come from the token or a validated request, never from an update.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BuilderTeamService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("createdAt", "updatedAt", "joinedAt", "status", "role");
	private static final int MIN_PHONE_SEARCH_DIGITS = 3;
	private static final String OPEN_MEMBERSHIP_INDEX = "uq_builder_teams_open_membership";

	private final BuilderTeamMemberRepository repository;
	private final BuilderTeamResponseMapper mapper;
	private final BuilderTeamGrantPolicy policy;
	private final SubscriptionService subscriptionService;
	private final UserAccountService userAccountService;
	private final PhoneNumberNormalizer phoneNumberNormalizer;
	private final Clock clock;

	// ---- Builder (app) ----

	/**
	 * Invites an existing account to the caller's team as {@code pending}. Needs {@code BUILDER_TEAM_CREATE},
	 * plus {@code BUILDER_TEAM_MANAGE_PERMISSIONS} when granting anything, and a free seat on the caller's
	 * subscription (checked under the subscription row lock, so concurrent invitations cannot exceed it).
	 */
	@Transactional
	public BuilderTeamMemberResponse invite(CurrentActor actor, CreateBuilderTeamMemberRequest request) {
		requirePermission(actor, BUILDER_TEAM_CREATE);
		if (BuilderTeamGrantPolicy.grantsAnything(request.permissions())) {
			requirePermission(actor, BUILDER_TEAM_MANAGE_PERMISSIONS);
		}
		Long builderId = actor.userId();
		requireSeat(builderId);
		String field = request.email() != null && !request.email().isBlank() ? "email" : "phone";
		Long employeeId = findEmployee(request.email(), request.phone(), field);
		policy.requireEligibleEmployee(employeeId, builderId, field);
		policy.requireAssignableRole(request.role(), actor.permissions());
		policy.requireDelegablePermissions(request.permissions(), actor.permissions());
		BuilderTeamMember member = new BuilderTeamMember(actor.userId(), builderId, employeeId, request.role(),
				request.permissions());
		member.setNotes(stripToNull(request.notes()));
		save(member);
		log.info("Builder team member invited memberId={} builderId={} employeeId={} role={}", member.getId(),
				builderId, employeeId, member.getRole());
		return mapper.toResponse(member, View.BUILDER);
	}

	/** The caller's own team; requires {@code BUILDER_TEAM_LIST}. The scope is part of the query. */
	@Transactional(readOnly = true)
	public PageResponse<BuilderTeamMemberResponse> listOwnTeam(CurrentActor actor, MyBuilderTeamFilter filter,
			Pageable pageable) {
		requirePermission(actor, BUILDER_TEAM_LIST);
		Specification<BuilderTeamMember> spec = matching(filter.search(), filter.role(), filter.status())
			.and((root, query, cb) -> cb.equal(root.get("builderId"), actor.userId()));
		return page(spec, pageable, View.BUILDER);
	}

	@Transactional(readOnly = true)
	public BuilderTeamMemberResponse getOwnTeamMember(Long id, CurrentActor actor) {
		BuilderTeamMember member = ownTeamMember(repository.findById(id), actor);
		requirePermission(actor, BUILDER_TEAM_VIEW);
		return mapper.toResponse(member, View.BUILDER);
	}

	// ---- Admin ----

	/**
	 * Creates a membership in any builder's team; requires {@code BUILDER_TEAM_CREATE_ANY}, plus
	 * {@code BUILDER_TEAM_MANAGE_STATUS} for {@code active} and {@code BUILDER_TEAM_MANAGE_PERMISSIONS}
	 * when granting anything. Not gated by the builder's subscription.
	 */
	@Transactional
	public BuilderTeamMemberResponse createAsAdmin(CurrentActor actor, AdminCreateBuilderTeamMemberRequest request) {
		requirePermission(actor, BUILDER_TEAM_CREATE_ANY);
		boolean active = "active".equals(request.status());
		if (active) {
			requirePermission(actor, BUILDER_TEAM_MANAGE_STATUS);
		}
		if (BuilderTeamGrantPolicy.grantsAnything(request.permissions())) {
			requirePermission(actor, BUILDER_TEAM_MANAGE_PERMISSIONS);
		}
		Set<String> builderPermissions = policy.requireEligibleBuilder(request.builderId());
		policy.requireEligibleEmployee(request.employeeId(), request.builderId(), "employeeId");
		policy.requireAssignableRole(request.role(), builderPermissions);
		policy.requireDelegablePermissions(request.permissions(), builderPermissions);
		BuilderTeamMember member = new BuilderTeamMember(actor.userId(), request.builderId(), request.employeeId(),
				request.role(), request.permissions());
		member.setNotes(stripToNull(request.notes()));
		if (active) {
			member.accept(clock.instant());
		}
		save(member);
		log.info("Builder team member created by admin memberId={} by={} builderId={} employeeId={} status={}",
				member.getId(), actor.userId(), member.getBuilderId(), member.getEmployeeId(),
				member.getStatus().getValue());
		return mapper.toResponse(member, View.ADMIN);
	}

	/** Every team; requires {@code BUILDER_TEAM_LIST_ANY}. */
	@Transactional(readOnly = true)
	public PageResponse<BuilderTeamMemberResponse> listAll(CurrentActor actor, BuilderTeamFilter filter,
			Pageable pageable) {
		requirePermission(actor, BUILDER_TEAM_LIST_ANY);
		if (filter.createdFrom() != null && filter.createdTo() != null
				&& filter.createdTo().isBefore(filter.createdFrom())) {
			throw new FieldValidationException("createdTo", "must not be before the start of the range");
		}
		Specification<BuilderTeamMember> spec = matching(filter.search(), filter.role(), filter.status())
			.and((root, query, cb) -> {
				List<Predicate> predicates = new ArrayList<>();
				if (filter.builderId() != null) {
					predicates.add(cb.equal(root.get("builderId"), filter.builderId()));
				}
				if (filter.employeeId() != null) {
					predicates.add(cb.equal(root.get("employeeId"), filter.employeeId()));
				}
				if (filter.createdFrom() != null) {
					predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.createdFrom()));
				}
				if (filter.createdTo() != null) {
					predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.createdTo()));
				}
				return cb.and(predicates.toArray(Predicate[]::new));
			});
		return page(spec, pageable, View.ADMIN);
	}

	@Transactional(readOnly = true)
	public BuilderTeamMemberResponse getAsAdmin(Long id, CurrentActor actor) {
		requirePermission(actor, BUILDER_TEAM_VIEW_ANY);
		return mapper.toResponse(repository.findById(id).orElseThrow(BuilderTeamExceptions::notFound), View.ADMIN);
	}

	// ---- Builder and admin ----

	/**
	 * Partial update. Needs {@code BUILDER_TEAM_UPDATE} (own team) or {@code BUILDER_TEAM_UPDATE_ANY}
	 * (admin), plus per field: {@code role} {@code BUILDER_TEAM_ASSIGN_ROLE}, {@code permissions}
	 * {@code BUILDER_TEAM_MANAGE_PERMISSIONS}, {@code status} {@code BUILDER_TEAM_MANAGE_STATUS}. A missing
	 * capability fails the whole request with 403 before anything changes.
	 * <p>
	 * Status: {@code inactive} and {@code revoked} from any open state; {@code active} reactivates an
	 * inactive member (builders need a free seat) or, for admins only, activates a pending invitation on
	 * the employee's behalf. Builders accept nothing on behalf of the employee.
	 */
	@Transactional
	public BuilderTeamMemberResponse update(Long id, CurrentActor actor, UpdateBuilderTeamMemberRequest request,
			boolean admin) {
		BuilderTeamMember member = lockForAction(id, actor, admin, BUILDER_TEAM_UPDATE, BUILDER_TEAM_UPDATE_ANY);
		Set<String> present = request.presentFields();
		Set<String> forbidden = new LinkedHashSet<>();
		requireCapability(actor, present, "role", BUILDER_TEAM_ASSIGN_ROLE, forbidden);
		requireCapability(actor, present, "permissions", BUILDER_TEAM_MANAGE_PERMISSIONS, forbidden);
		requireCapability(actor, present, "status", BUILDER_TEAM_MANAGE_STATUS, forbidden);
		if (!forbidden.isEmpty()) {
			throw BuilderTeamExceptions.fieldsForbidden(forbidden);
		}
		boolean grantsChange = present.contains("role") || present.contains("permissions");
		if (grantsChange && !member.getStatus().isOpen()) {
			throw BuilderTeamExceptions.notEditable(member.getStatus());
		}
		if (grantsChange) {
			Set<String> builderPermissions;
			if (admin) {
				builderPermissions = policy.requireEligibleBuilder(member.getBuilderId());
			}
			else {
				subscriptionService.requireTeamManagement(member.getBuilderId());
				builderPermissions = actor.permissions();
			}
			apply(request.getRole(), role -> {
				policy.requireAssignableRole(role, builderPermissions);
				member.setRole(role);
			});
			apply(request.getPermissions(), permissions -> {
				policy.requireDelegablePermissions(permissions, builderPermissions);
				member.replacePermissions(permissions);
			});
		}
		BuilderTeamStatus previous = member.getStatus();
		apply(request.getStatus(), value -> changeStatus(member, BuilderTeamStatus.fromValue(value), admin));
		apply(request.getNotes(), notes -> member.setNotes(stripToNull(notes)));
		repository.flush();
		log.info("Builder team member updated memberId={} by={} admin={} fields={} status={}->{}", member.getId(),
				actor.userId(), admin, present, previous.getValue(), member.getStatus().getValue());
		return mapper.toResponse(member, admin ? View.ADMIN : View.BUILDER);
	}

	/**
	 * Removes a member: revokes an open membership, then soft-deletes it, so it disappears from lists and
	 * frees the seat and the builder/employee pair. Site visits, leads and reports assigned to the employee
	 * are separate records and stay as they are. Never needs a subscription.
	 */
	@Transactional
	public void delete(Long id, CurrentActor actor, boolean admin) {
		BuilderTeamMember member = lockForAction(id, actor, admin, BUILDER_TEAM_DELETE, BUILDER_TEAM_DELETE_ANY);
		if (member.getStatus().isOpen()) {
			member.revoke();
			// Written before the soft delete, which would otherwise replace the pending update.
			repository.flush();
		}
		repository.delete(member);
		repository.flush();
		log.info("Builder team member removed memberId={} by={} admin={} builderId={} employeeId={}", id,
				actor.userId(), admin, member.getBuilderId(), member.getEmployeeId());
	}

	// ---- Employee (app) ----

	/** The caller's memberships in other builders' teams; requires {@code BUILDER_TEAM_MEMBERSHIP_VIEW}. */
	@Transactional(readOnly = true)
	public PageResponse<BuilderTeamMemberResponse> listOwnMemberships(CurrentActor actor, MyMembershipFilter filter,
			Pageable pageable) {
		requirePermission(actor, BUILDER_TEAM_MEMBERSHIP_VIEW);
		Specification<BuilderTeamMember> spec = matching(null, null, filter.status())
			.and((root, query, cb) -> cb.equal(root.get("employeeId"), actor.userId()));
		return page(spec, pageable, View.EMPLOYEE);
	}

	@Transactional(readOnly = true)
	public BuilderTeamMemberResponse getOwnMembership(Long id, CurrentActor actor) {
		BuilderTeamMember member = ownMembership(repository.findById(id), actor);
		requirePermission(actor, BUILDER_TEAM_MEMBERSHIP_VIEW);
		return mapper.toResponse(member, View.EMPLOYEE);
	}

	/** The invited employee accepts; the seat was already counted when they were invited. */
	@Transactional
	public BuilderTeamMemberResponse accept(Long id, CurrentActor actor) {
		BuilderTeamMember member = ownMembership(repository.findByIdForUpdate(id), actor);
		requirePermission(actor, BUILDER_TEAM_MEMBERSHIP_RESPOND);
		member.accept(clock.instant());
		repository.flush();
		log.info("Builder team invitation accepted memberId={} employeeId={} builderId={}", id, actor.userId(),
				member.getBuilderId());
		return mapper.toResponse(member, View.EMPLOYEE);
	}

	@Transactional
	public BuilderTeamMemberResponse reject(Long id, CurrentActor actor) {
		BuilderTeamMember member = ownMembership(repository.findByIdForUpdate(id), actor);
		requirePermission(actor, BUILDER_TEAM_MEMBERSHIP_RESPOND);
		member.reject();
		repository.flush();
		log.info("Builder team invitation rejected memberId={} employeeId={} builderId={}", id, actor.userId(),
				member.getBuilderId());
		return mapper.toResponse(member, View.EMPLOYEE);
	}

	// ---- Helpers ----

	private void changeStatus(BuilderTeamMember member, BuilderTeamStatus next, boolean admin) {
		BuilderTeamStatus current = member.getStatus();
		switch (next) {
			case INACTIVE -> member.deactivate();
			case REVOKED -> member.revoke();
			case ACTIVE -> {
				if (current == BuilderTeamStatus.PENDING && admin) {
					member.accept(clock.instant());
				}
				else if (current == BuilderTeamStatus.INACTIVE) {
					if (!admin) {
						requireSeat(member.getBuilderId());
					}
					member.reactivate();
				}
				else {
					throw BuilderTeamExceptions.invalidStatusTransition(current, next);
				}
			}
			default -> throw BuilderTeamExceptions.invalidStatusTransition(current, next);
		}
	}

	/** A free seat on the builder's subscription, holding its row lock until the transaction ends. */
	private void requireSeat(Long builderId) {
		subscriptionService.requireTeamMemberCapacity(builderId,
				() -> repository.countByBuilderIdAndStatusIn(builderId, BuilderTeamStatus.SEATS));
	}

	private BuilderTeamMember lockForAction(Long id, CurrentActor actor, boolean admin, String own, String any) {
		if (admin) {
			requirePermission(actor, any);
			return repository.findByIdForUpdate(id).orElseThrow(BuilderTeamExceptions::notFound);
		}
		BuilderTeamMember member = ownTeamMember(repository.findByIdForUpdate(id), actor);
		requirePermission(actor, own);
		return member;
	}

	/** 404 unless the caller is the membership's builder; checked before permissions, so ids cannot be probed. */
	private static BuilderTeamMember ownTeamMember(Optional<BuilderTeamMember> found, CurrentActor actor) {
		return found.filter(member -> Objects.equals(member.getBuilderId(), actor.userId()))
			.orElseThrow(BuilderTeamExceptions::notFound);
	}

	private static BuilderTeamMember ownMembership(Optional<BuilderTeamMember> found, CurrentActor actor) {
		return found.filter(member -> Objects.equals(member.getEmployeeId(), actor.userId()))
			.orElseThrow(BuilderTeamExceptions::notFound);
	}

	private Long findEmployee(String email, String phone, String field) {
		String normalizedEmail = email == null || email.isBlank() ? null : email.strip().toLowerCase(Locale.ROOT);
		String normalizedPhone = normalizedEmail != null ? null : phoneNumberNormalizer.normalize(phone)
			.orElseThrow(() -> new FieldValidationException("phone", "must be a valid phone number"));
		return userAccountService.findActiveVerifiedId(normalizedEmail, normalizedPhone)
			.orElseThrow(() -> new FieldValidationException(field, BuilderTeamGrantPolicy.EMPLOYEE_NOT_ELIGIBLE));
	}

	/**
	 * Saves and flushes, turning a clash with an open membership of the same builder and employee into 409.
	 * Checked first for a clear error; the unique index catches concurrent requests.
	 */
	private void save(BuilderTeamMember member) {
		if (repository.existsByBuilderIdAndEmployeeIdAndStatusIn(member.getBuilderId(), member.getEmployeeId(),
				BuilderTeamStatus.OPEN)) {
			throw BuilderTeamExceptions.duplicateMembership();
		}
		try {
			repository.saveAndFlush(member);
		}
		catch (DataIntegrityViolationException ex) {
			String cause = ex.getMostSpecificCause().getMessage();
			if (cause != null && cause.contains(OPEN_MEMBERSHIP_INDEX)) {
				throw BuilderTeamExceptions.duplicateMembership();
			}
			throw ex;
		}
	}

	private PageResponse<BuilderTeamMemberResponse> page(Specification<BuilderTeamMember> spec, Pageable pageable,
			View view) {
		Page<BuilderTeamMember> page = repository.findAll(spec, paging(pageable));
		return PageResponse.of(page, mapper.mapper(page.getContent(), view));
	}

	/** Search (employee name, email or phone digits), role and status; every argument optional. */
	private static Specification<BuilderTeamMember> matching(String search, String role, String status) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (search != null && !search.isBlank()) {
				String term = search.strip().toLowerCase(Locale.ROOT);
				String pattern = "%" + escapeLike(term) + "%";
				Subquery<Long> employees = query.subquery(Long.class);
				Root<User> user = employees.from(User.class);
				List<Predicate> any = new ArrayList<>(List.of(cb.like(cb.lower(user.get("fullName")), pattern, '\\'),
						cb.like(cb.lower(user.get("email")), pattern, '\\')));
				String digits = term.replaceAll("\\D", "");
				if (digits.length() >= MIN_PHONE_SEARCH_DIGITS) {
					any.add(cb.like(user.get("phone"), "%" + digits + "%"));
				}
				employees.select(user.get("id")).where(cb.or(any.toArray(Predicate[]::new)));
				predicates.add(root.get("employeeId").in(employees));
			}
			if (role != null) {
				predicates.add(cb.equal(root.get("role"), role));
			}
			if (status != null) {
				predicates.add(cb.equal(root.get("status"), BuilderTeamStatus.fromValue(status)));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	/** Allow-listed sort properties plus a unique tiebreaker, so pages never repeat or skip rows. */
	private static PageRequest paging(Pageable pageable) {
		for (Sort.Order order : pageable.getSort()) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
	}

	private static void requireCapability(CurrentActor actor, Set<String> present, String field, String permission,
			Set<String> forbidden) {
		if (present.contains(field) && !actor.has(permission)) {
			forbidden.add(field);
		}
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw BuilderTeamExceptions.actionForbidden();
		}
	}

	private static <T> void apply(Optional<T> field, Consumer<T> setter) {
		if (field != null) {
			setter.accept(field.orElse(null));
		}
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

	private static String stripToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

}
