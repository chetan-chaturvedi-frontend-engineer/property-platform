package com.propertypro.property_platform.user.service;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.auth.service.TokenService;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.phone.PhoneNumberNormalizer;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.role.service.RoleInfo;
import com.propertypro.property_platform.role.service.RolePermissionService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.Permissions;
import com.propertypro.property_platform.user.domain.User;
import com.propertypro.property_platform.user.domain.UserStatus;
import com.propertypro.property_platform.user.dto.CreateManagedUserRequest;
import com.propertypro.property_platform.user.dto.ManagedUserFilter;
import com.propertypro.property_platform.user.dto.ManagedUserResponse;
import com.propertypro.property_platform.user.dto.UpdateManagedUserRequest;
import com.propertypro.property_platform.user.dto.UserRoleOptionResponse;
import com.propertypro.property_platform.user.dto.UserStatsResponse;
import com.propertypro.property_platform.user.exception.ManagedUserExceptions;
import com.propertypro.property_platform.user.repository.UserRepository;
import com.propertypro.property_platform.user.repository.UserSpecs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * Admin management of every account in {@code users}: admins and app users share the table, and a user's role
 * is the role whose slug equals {@code users.user_type}. The controller checks the endpoint permission; this
 * service enforces the rules that depend on the data, against the caller's server-side permissions:
 * <ul>
 * <li>Super admin is never assigned, and super admin accounts are never changed or deleted here.</li>
 * <li>Roles that grant {@code ADMIN_PANEL_ACCESS} are privileged: a caller only assigns such a role, and only
 * changes or deletes a user holding one, when the caller holds every permission it grants (no escalation).
 * App roles only grant access to the user's own data, so any caller with the endpoint permission may assign
 * them and manage their users.</li>
 * <li>Status changes need {@code USER_CHANGE_STATUS}; an account never returns to pending.</li>
 * <li>Nobody deletes themselves or changes their own role or status.</li>
 * </ul>
 * New accounts are unverified unless the admin creates them active and sign-in ready ({@code emailVerified}).
 * Writes are logged automatically by {@code SystemLogInterceptor}; role and status changes, and emails verified
 * by an admin, also get an explicit entry. Blocking or deleting an account, or changing its email or phone, ends its
 * sessions.
 */
@Slf4j
@Service
public class AdminUserService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "fullName", "email", "userType", "status",
			"createdAt", "updatedAt");
	static final String LOG_MODULE = "users";

	private final UserRepository userRepository;
	private final RolePermissionService roles;
	private final TokenService tokenService;
	private final PasswordEncoder passwordEncoder;
	private final PhoneNumberNormalizer phoneNormalizer;
	private final SystemLogService systemLog;
	private final TransactionTemplate transaction;
	private final Clock clock;

	public AdminUserService(UserRepository userRepository, RolePermissionService roles, TokenService tokenService,
			PasswordEncoder passwordEncoder, PhoneNumberNormalizer phoneNormalizer, SystemLogService systemLog,
			PlatformTransactionManager transactionManager, Clock clock) {
		this.userRepository = userRepository;
		this.roles = roles;
		this.tokenService = tokenService;
		this.passwordEncoder = passwordEncoder;
		this.phoneNormalizer = phoneNormalizer;
		this.systemLog = systemLog;
		this.transaction = new TransactionTemplate(transactionManager);
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public PageResponse<ManagedUserResponse> list(ManagedUserFilter filter, Pageable pageable) {
		if (filter.createdFrom() != null && filter.createdTo() != null
				&& filter.createdFrom().isAfter(filter.createdTo())) {
			throw new FieldValidationException("createdTo", "must not be before createdFrom");
		}
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		Page<User> page = userRepository.findAll(UserSpecs.matching(filter), request);
		// One role query for the whole page instead of one per user.
		Map<String, RoleInfo> rolesBySlug = roles.findRoles(
				page.getContent().stream().map(User::getUserType).collect(Collectors.toSet()));
		return PageResponse.of(page, user -> ManagedUserResponse.from(user, rolesBySlug.get(user.getUserType())));
	}

	@Transactional(readOnly = true)
	public UserStatsResponse stats() {
		Map<String, Long> byStatus = new LinkedHashMap<>();
		for (UserStatus status : UserStatus.values()) {
			byStatus.put(status.getValue(), 0L);
		}
		long total = 0;
		for (UserRepository.StatusCount count : userRepository.countByStatus()) {
			byStatus.merge(count.getStatus(), count.getTotal(), Long::sum);
			total += count.getTotal();
		}
		return new UserStatsResponse(total, byStatus);
	}

	@Transactional(readOnly = true)
	public ManagedUserResponse get(Long id) {
		return toResponse(find(id));
	}

	/** Every non-deleted role, with whether the caller may assign it. */
	@Transactional(readOnly = true)
	public List<UserRoleOptionResponse> roleOptions(CurrentActor actor) {
		return roles.listRoles().stream()
			.map(role -> new UserRoleOptionResponse(role.slug(), role.name(), role.active(), isAssignable(role, actor)))
			.toList();
	}

	public ManagedUserResponse create(CreateManagedUserRequest request, CurrentActor actor) {
		UserStatus status = request.status() == null ? UserStatus.PENDING : UserStatus.fromValue(request.status());
		if (status != UserStatus.PENDING) {
			requireStatusPermission(actor);
		}
		// Sign-in ready: the admin vouches for the email. Only for active accounts: pending means "awaiting
		// verification", and an inactive account cannot sign in anyway.
		boolean signInReady = Boolean.TRUE.equals(request.emailVerified());
		if (signInReady && status != UserStatus.ACTIVE) {
			throw new FieldValidationException("emailVerified", "requires status active");
		}
		RoleInfo role = requireAssignableRole(request.userType(), actor);
		String email = normalizeEmail(request.email());
		String phone = normalizePhone(request.phone());
		// Hash before opening the transaction so a connection is not held during BCrypt.
		String passwordHash = passwordEncoder.encode(request.password());

		try {
			User saved = transaction.execute(tx -> {
				requireUnique(email, phone, null);
				User user = new User(email, phone, passwordHash, request.fullName().strip());
				user.setUserType(role.slug());
				user.setStatus(status);
				if (signInReady) {
					user.markEmailVerified(clock.instant());
				}
				return userRepository.saveAndFlush(user);
			});
			log.info("User created by admin userId={} adminId={} signInReady={}", saved.getId(), actor.userId(),
					signInReady);
			if (signInReady) {
				systemLog.record(SystemLogEntry.success(LOG_MODULE, "User email verified by admin")
					.withReference("User", saved.getId()));
			}
			return ManagedUserResponse.from(saved, role);
		}
		catch (DataIntegrityViolationException ex) {
			throw ManagedUserExceptions.alreadyExists();
		}
	}

	/** Explicit nulls for required fields are already rejected by request validation. */
	@Transactional
	public ManagedUserResponse update(Long id, UpdateManagedUserRequest request, CurrentActor actor) {
		User user = find(id);
		requireManageable(user, actor);
		boolean self = user.getId().equals(actor.userId());

		Optional<UserStatus> newStatus = Optional.ofNullable(request.getStatus())
			.map(value -> UserStatus.fromValue(value.orElseThrow()))
			.filter(value -> value != user.getStatus());
		Optional<String> newUserType = Optional.ofNullable(request.getUserType())
			.map(Optional::orElseThrow)
			.filter(value -> !value.equals(user.getUserType()));
		if (self && (newStatus.isPresent() || newUserType.isPresent())) {
			throw ManagedUserExceptions.selfModification();
		}
		if (newStatus.isPresent()) {
			requireStatusPermission(actor);
			if (newStatus.get() == UserStatus.PENDING) {
				throw ManagedUserExceptions.invalidStatusTransition();
			}
		}
		RoleInfo newRole = newUserType.map(slug -> requireAssignableRole(slug, actor)).orElse(null);

		UserStatus oldStatus = user.getStatus();
		String oldUserType = user.getUserType();
		boolean identifierChanged = false;

		apply(request.getFullName(), name -> user.setFullName(name.strip()));
		if (request.getEmail() != null) {
			String email = normalizeEmail(request.getEmail().orElseThrow());
			if (!email.equals(user.getEmail())) {
				if (userRepository.existsByEmailIncludingDeleted(email, user.getId())) {
					throw ManagedUserExceptions.alreadyExists("email");
				}
				user.setEmail(email);
				user.setEmailVerifiedAt(null);
				identifierChanged = true;
			}
		}
		if (request.getPhone() != null) {
			String phone = normalizePhone(request.getPhone().orElse(null));
			if (!Objects.equals(phone, user.getPhone())) {
				if (phone != null && userRepository.existsByPhoneIncludingDeleted(phone, user.getId())) {
					throw ManagedUserExceptions.alreadyExists("phone");
				}
				user.setPhone(phone);
				user.setPhoneVerifiedAt(null);
				identifierChanged = true;
			}
		}
		newStatus.ifPresent(user::setStatus);
		if (newRole != null) {
			user.setUserType(newRole.slug());
		}

		User saved;
		try {
			// Flushes so database checks fail inside this call and the response has the new updatedAt.
			saved = userRepository.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException ex) {
			throw ManagedUserExceptions.alreadyExists();
		}
		if ((newStatus.isPresent() && saved.getStatus() != UserStatus.ACTIVE) || identifierChanged) {
			tokenService.revokeAllSessions(saved.getId(),
					identifierChanged ? "identifier_changed" : "account_" + saved.getStatus().getValue());
		}
		newStatus.ifPresent(status -> logChange(saved, "User status changed", "status", oldStatus.getValue(),
				status.getValue()));
		if (newRole != null) {
			logChange(saved, "User role changed", "userType", oldUserType, newRole.slug());
		}
		return newRole != null ? ManagedUserResponse.from(saved, newRole) : toResponse(saved);
	}

	/** Soft delete; the email and phone stay reserved and the account's records are kept. */
	@Transactional
	public void delete(Long id, CurrentActor actor) {
		User user = find(id);
		if (user.getId().equals(actor.userId())) {
			throw ManagedUserExceptions.selfModification();
		}
		requireManageable(user, actor);
		userRepository.delete(user);
		userRepository.flush();
		tokenService.revokeAllSessions(user.getId(), "account_deleted");
		log.info("User deleted by admin userId={} adminId={}", user.getId(), actor.userId());
	}

	private User find(Long id) {
		return userRepository.findById(id).orElseThrow(ManagedUserExceptions::notFound);
	}

	private ManagedUserResponse toResponse(User user) {
		return ManagedUserResponse.from(user, roles.findRoles(Set.of(user.getUserType())).get(user.getUserType()));
	}

	/**
	 * Super admin accounts are never changed here. For a privileged role the caller must hold every permission it
	 * grants, so nobody can demote, block or delete someone with more dashboard access than themselves.
	 */
	private void requireManageable(User user, CurrentActor actor) {
		RoleInfo current = roles.findRoles(Set.of(user.getUserType())).get(user.getUserType());
		if (current == null) {
			return;
		}
		if (current.superAdmin()) {
			throw ManagedUserExceptions.protectedAccount();
		}
		if (isPrivileged(current) && !actor.permissions().containsAll(current.permissions())) {
			throw ManagedUserExceptions.roleForbidden();
		}
	}

	private RoleInfo requireAssignableRole(String slug, CurrentActor actor) {
		RoleInfo role = roles.findRoles(Set.of(slug)).get(slug);
		if (role == null || !role.active()) {
			throw new FieldValidationException("userType", "must be an active role");
		}
		if (!isAssignable(role, actor)) {
			throw ManagedUserExceptions.roleForbidden();
		}
		return role;
	}

	private static boolean isAssignable(RoleInfo role, CurrentActor actor) {
		return role.active() && !role.superAdmin()
				&& (!isPrivileged(role) || actor.permissions().containsAll(role.permissions()));
	}

	/** Grants the admin dashboard; app permissions only ever cover the user's own data. */
	private static boolean isPrivileged(RoleInfo role) {
		return role.permissions().contains(Permissions.ADMIN_PANEL_ACCESS);
	}

	private static void requireStatusPermission(CurrentActor actor) {
		if (!actor.has(Permissions.USER_CHANGE_STATUS)) {
			throw ManagedUserExceptions.statusForbidden();
		}
	}

	private void requireUnique(String email, String phone, Long excludeId) {
		if (userRepository.existsByEmailIncludingDeleted(email, excludeId)) {
			throw ManagedUserExceptions.alreadyExists("email");
		}
		if (phone != null && userRepository.existsByPhoneIncludingDeleted(phone, excludeId)) {
			throw ManagedUserExceptions.alreadyExists("phone");
		}
	}

	private static String normalizeEmail(String email) {
		return email.strip().toLowerCase(Locale.ROOT);
	}

	/** Null or blank = no phone; anything else must normalize to E.164. */
	private String normalizePhone(String phone) {
		if (phone == null || phone.isBlank()) {
			return null;
		}
		return phoneNormalizer.normalize(phone)
			.orElseThrow(() -> new FieldValidationException("phone", "must be a valid phone number"));
	}

	private void logChange(User user, String action, String field, String from, String to) {
		systemLog.record(SystemLogEntry.success(LOG_MODULE, action)
			.withReference("User", user.getId())
			.withAdditionalData(Map.of("field", field, "from", from, "to", to)));
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

}
