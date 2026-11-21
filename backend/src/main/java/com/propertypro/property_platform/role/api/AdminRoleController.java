package com.propertypro.property_platform.role.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.role.dto.CreateRoleRequest;
import com.propertypro.property_platform.role.dto.PermissionModuleResponse;
import com.propertypro.property_platform.role.dto.RoleFilter;
import com.propertypro.property_platform.role.dto.RoleResponse;
import com.propertypro.property_platform.role.dto.RoleStatsResponse;
import com.propertypro.property_platform.role.dto.UpdateRoleRequest;
import com.propertypro.property_platform.role.service.AdminRoleService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Role management for the admin dashboard. {@code ADMIN_PANEL_ACCESS} is required for the whole path by
 * {@code SecurityConfig}; each endpoint adds its own permission. Rules that depend on the role (no privilege
 * escalation, protected, default and own roles) are enforced in {@link AdminRoleService} and {@code Role}.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/roles", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin roles", description = "List, view, create, edit and delete roles and their permissions")
@RequiredArgsConstructor
public class AdminRoleController {

	private final AdminRoleService roleService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List roles", description = """
			Filters: search (name, slug or description), status. Sort by name (default, ascending), slug, status, \
			createdAt, updatedAt or id; id always breaks ties. Each role includes its user count.""")
	@GetMapping
	@PreAuthorize("hasAuthority('ROLE_VIEW')")
	public PageResponse<RoleResponse> list(CurrentActor actor, @Valid RoleFilter filter,
			@SortDefault(sort = "name") Pageable pageable) {
		return roleService.list(filter, pageable, actor);
	}

	@Operation(summary = "Role counts", description = "Roles, active and default roles, permissions and admin users.")
	@GetMapping("/stats")
	@PreAuthorize("hasAuthority('ROLE_VIEW')")
	public RoleStatsResponse stats() {
		return roleService.stats();
	}

	@Operation(summary = "Permission catalog", description = "Every module and action a role can grant, in display order.")
	@GetMapping("/permissions")
	@PreAuthorize("hasAuthority('ROLE_VIEW')")
	public List<PermissionModuleResponse> permissions() {
		return roleService.permissionCatalog();
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('ROLE_VIEW')")
	public RoleResponse get(CurrentActor actor, @PathVariable Long id) {
		return roleService.get(id, actor);
	}

	@Operation(summary = "Create a role", description = """
			JSON: name, slug (immutable, never reused), description (optional), status (active by default), \
			permissions {module: {action: boolean}} from the catalog, all held by the caller. Unknown fields are \
			rejected.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('ROLE_CREATE')")
	public RoleResponse create(CurrentActor actor, @Valid @RequestBody CreateRoleRequest request) {
		acquireWriteLimit(actor);
		return roleService.create(request, actor);
	}

	@Operation(summary = "Edit a role", description = """
			Partial update of name, description (null clears), status and permissions (replaces all). Not for \
			super admin or the caller's own status and permissions. Unknown fields, including slug, are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('ROLE_UPDATE')")
	public RoleResponse update(CurrentActor actor, @PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request) {
		acquireWriteLimit(actor);
		return roleService.update(id, request, actor);
	}

	@Operation(summary = "Delete a role", description = """
			Soft delete; the slug stays reserved. Not for default roles, the caller's own role or roles still \
			assigned to users.""")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('ROLE_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		roleService.delete(id, actor);
		return ResponseEntity.noContent().build();
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("role:write:user:" + actor.userId(), limits.roleWriteUser());
	}

}
