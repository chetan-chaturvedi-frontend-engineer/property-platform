package com.propertypro.property_platform.role.service;

import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.role.domain.RoleStatus;
import com.propertypro.property_platform.role.dto.CreateRoleRequest;
import com.propertypro.property_platform.role.dto.PermissionModuleResponse;
import com.propertypro.property_platform.role.dto.RoleFilter;
import com.propertypro.property_platform.role.dto.RoleResponse;
import com.propertypro.property_platform.role.dto.RoleStatsResponse;
import com.propertypro.property_platform.role.dto.UpdateRoleRequest;
import com.propertypro.property_platform.role.exception.RoleExceptions;
import com.propertypro.property_platform.role.repository.RoleRepository;
import com.propertypro.property_platform.role.repository.RoleSpecs;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Admin management of roles. The controller checks the endpoint permission; this service and {@link Role} enforce
 * the rules that depend on the data, against the caller's server-side permissions:
 * <ul>
 * <li>Only permissions from {@link PermissionCatalog} can be granted.</li>
 * <li>A caller only creates, changes or deletes roles whose permissions (before and after) they all hold.</li>
 * <li>The super admin role is never changed here; default roles are never deleted.</li>
 * <li>Nobody changes the status or permissions of their own role, or deletes it (no self lock-out).</li>
 * <li>A role still assigned to users cannot be deleted.</li>
 * </ul>
 * Writes are logged automatically by {@code SystemLogInterceptor}; permission and status changes also get an
 * explicit entry with what changed. Permissions are read on every request, so changes apply immediately.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRoleService {

	/** Sort parameter names, which are also the entity property names; anything else is rejected. */
	static final List<String> SORTABLE_FIELDS = List.of("id", "name", "slug", "status", "createdAt", "updatedAt");
	static final String LOG_MODULE = "roles";

	private final RoleRepository roleRepository;
	private final SystemLogService systemLog;

	@Transactional(readOnly = true)
	public PageResponse<RoleResponse> list(RoleFilter filter, Pageable pageable, CurrentActor actor) {
		PageRequest request = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				stableSort(pageable.getSort()));
		Page<Role> page = roleRepository.findAll(RoleSpecs.matching(filter), request);
		Map<String, Long> userCounts = userCounts(page.getContent().stream().map(Role::getSlug).toList());
		String ownSlug = ownSlug(actor);
		return PageResponse.of(page, role -> toResponse(role, userCounts.getOrDefault(role.getSlug(), 0L), actor, ownSlug));
	}

	@Transactional(readOnly = true)
	public RoleStatsResponse stats() {
		return new RoleStatsResponse(roleRepository.count(), roleRepository.countByStatus(RoleStatus.ACTIVE),
				roleRepository.countBySlugIn(Role.DEFAULT_SLUGS), PermissionCatalog.codes().size(),
				roleRepository.countAdminPanelUsers());
	}

	public List<PermissionModuleResponse> permissionCatalog() {
		return PermissionCatalog.MODULES.stream().map(PermissionModuleResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public RoleResponse get(Long id, CurrentActor actor) {
		return toResponse(find(id), actor);
	}

	@Transactional
	public RoleResponse create(CreateRoleRequest request, CurrentActor actor) {
		String name = request.name().strip();
		if (roleRepository.existsByNameIgnoreCase(name, null)) {
			throw RoleExceptions.alreadyExists("name");
		}
		if (Role.SUPER_ADMIN_SLUG.equals(request.slug())) {
			throw RoleExceptions.slugReserved();
		}
		if (roleRepository.existsBySlugIncludingDeleted(request.slug())) {
			throw RoleExceptions.alreadyExists("slug");
		}
		Map<String, Map<String, Boolean>> permissions = requireCatalog(
				request.permissions() == null ? Map.of() : request.permissions());
		Role role = new Role(name, request.slug(), permissions, actor.permissions());
		role.setDescription(normalizeDescription(request.description()));
		if (request.status() != null && RoleStatus.fromValue(request.status()) != RoleStatus.ACTIVE) {
			role.changeStatus(RoleStatus.fromValue(request.status()), actor.permissions());
		}
		Role saved = save(role);
		log.info("Role created roleId={} slug={} adminId={}", saved.getId(), saved.getSlug(), actor.userId());
		systemLog.record(SystemLogEntry.success(LOG_MODULE, "Role permissions granted")
			.withReference("Role", saved.getId())
			.withAdditionalData(Map.of("added", List.copyOf(saved.configuredPermissions()), "removed", List.of())));
		return toResponse(saved, 0L, actor, ownSlug(actor));
	}

	/** Explicit nulls for required fields are already rejected by request validation. */
	@Transactional
	public RoleResponse update(Long id, UpdateRoleRequest request, CurrentActor actor) {
		Role role = find(id);
		requireManageable(role, actor);

		Optional<RoleStatus> newStatus = Optional.ofNullable(request.getStatus())
			.map(value -> RoleStatus.fromValue(value.orElseThrow()))
			.filter(value -> value != role.getStatus());
		Optional<Map<String, Map<String, Boolean>>> newPermissions = Optional.ofNullable(request.getPermissions())
			.map(value -> requireCatalog(value.orElseThrow()))
			.filter(value -> !value.equals(role.getPermissions()));
		if ((newStatus.isPresent() || newPermissions.isPresent()) && isOwnRole(role, actor)) {
			throw RoleExceptions.selfModification();
		}

		if (request.getName() != null) {
			String name = request.getName().orElseThrow().strip();
			if (!name.equals(role.getName())) {
				if (roleRepository.existsByNameIgnoreCase(name, role.getId())) {
					throw RoleExceptions.alreadyExists("name");
				}
				role.setName(name);
			}
		}
		if (request.getDescription() != null) {
			role.setDescription(normalizeDescription(request.getDescription().orElse(null)));
		}
		Set<String> before = role.configuredPermissions();
		newPermissions.ifPresent(permissions -> role.replacePermissions(permissions, actor.permissions()));
		RoleStatus oldStatus = role.getStatus();
		newStatus.ifPresent(status -> role.changeStatus(status, actor.permissions()));

		Role saved = save(role);
		if (newPermissions.isPresent()) {
			Set<String> after = saved.configuredPermissions();
			systemLog.record(SystemLogEntry.success(LOG_MODULE, "Role permissions changed")
				.withReference("Role", saved.getId())
				.withAdditionalData(Map.of("added", difference(after, before), "removed", difference(before, after))));
		}
		newStatus.ifPresent(status -> systemLog.record(SystemLogEntry.success(LOG_MODULE, "Role status changed")
			.withReference("Role", saved.getId())
			.withAdditionalData(Map.of("field", "status", "from", oldStatus.getValue(), "to", status.getValue()))));
		return toResponse(saved, actor);
	}

	/** Soft delete; the slug stays reserved so users still pointing at it never inherit a new role. */
	@Transactional
	public void delete(Long id, CurrentActor actor) {
		Role role = find(id);
		if (role.isSuperAdmin()) {
			throw RoleExceptions.superAdminProtected();
		}
		if (role.isDefault()) {
			throw RoleExceptions.defaultProtected();
		}
		role.checkDeletableBy(actor.permissions());
		if (isOwnRole(role, actor)) {
			throw RoleExceptions.selfModification();
		}
		long users = userCounts(List.of(role.getSlug())).getOrDefault(role.getSlug(), 0L);
		if (users > 0) {
			throw RoleExceptions.inUse(users);
		}
		roleRepository.delete(role);
		roleRepository.flush();
		log.info("Role deleted roleId={} slug={} adminId={}", role.getId(), role.getSlug(), actor.userId());
	}

	private Role find(Long id) {
		return roleRepository.findById(id).orElseThrow(RoleExceptions::notFound);
	}

	private Role save(Role role) {
		try {
			// Flushes so database checks fail inside this call and the response has the new updatedAt.
			return roleRepository.saveAndFlush(role);
		}
		catch (DataIntegrityViolationException ex) {
			throw RoleExceptions.alreadyExists("slug");
		}
	}

	/** Super admin is never changed here; other roles only by a caller holding every permission they grant. */
	private static void requireManageable(Role role, CurrentActor actor) {
		if (role.isSuperAdmin()) {
			throw RoleExceptions.superAdminProtected();
		}
		if (!isManageable(role, actor)) {
			throw RoleExceptions.permissionEscalation();
		}
	}

	private static boolean isManageable(Role role, CurrentActor actor) {
		return !role.isSuperAdmin() && actor.permissions().containsAll(role.configuredPermissions());
	}

	private boolean isOwnRole(Role role, CurrentActor actor) {
		return role.getSlug().equals(ownSlug(actor));
	}

	private String ownSlug(CurrentActor actor) {
		return roleRepository.findUserTypeOfUser(actor.userId()).orElse(null);
	}

	/** Rejects module or action keys that are not in the catalog, so unknown permissions are never stored. */
	private static Map<String, Map<String, Boolean>> requireCatalog(Map<String, Map<String, Boolean>> permissions) {
		Map<String, Map<String, Boolean>> copy = new LinkedHashMap<>();
		permissions.forEach((module, actions) -> {
			if (actions == null) {
				throw new FieldValidationException("permissions", "has an invalid module: " + module);
			}
			actions.forEach((action, granted) -> {
				if (!PermissionCatalog.contains(module, action)) {
					throw new FieldValidationException("permissions", "has an unknown permission: " + module + "." + action);
				}
				if (granted == null) {
					throw new FieldValidationException("permissions", "has an invalid action in module " + module);
				}
			});
			copy.put(module, new LinkedHashMap<>(actions));
		});
		return copy;
	}

	private Map<String, Long> userCounts(Collection<String> slugs) {
		if (slugs.isEmpty()) {
			return Map.of();
		}
		return roleRepository.countUsersBySlug(slugs).stream()
			.collect(Collectors.toMap(RoleRepository.SlugCount::getSlug, RoleRepository.SlugCount::getTotal));
	}

	private RoleResponse toResponse(Role role, CurrentActor actor) {
		long users = userCounts(List.of(role.getSlug())).getOrDefault(role.getSlug(), 0L);
		return toResponse(role, users, actor, ownSlug(actor));
	}

	private static RoleResponse toResponse(Role role, long userCount, CurrentActor actor, String ownSlug) {
		return RoleResponse.from(role, userCount, isManageable(role, actor), role.getSlug().equals(ownSlug));
	}

	private static String normalizeDescription(String description) {
		return description == null || description.isBlank() ? null : description.strip();
	}

	private static List<String> difference(Set<String> from, Set<String> minus) {
		Set<String> result = new LinkedHashSet<>(from);
		result.removeAll(minus);
		return List.copyOf(result);
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
