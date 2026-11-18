package com.propertypro.property_platform.user.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import com.propertypro.property_platform.user.dto.CreateManagedUserRequest;
import com.propertypro.property_platform.user.dto.ManagedUserFilter;
import com.propertypro.property_platform.user.dto.ManagedUserResponse;
import com.propertypro.property_platform.user.dto.UpdateManagedUserRequest;
import com.propertypro.property_platform.user.dto.UserRoleOptionResponse;
import com.propertypro.property_platform.user.dto.UserStatsResponse;
import com.propertypro.property_platform.user.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
 * User management for the admin dashboard: every account in {@code users}, admins and app users alike.
 * {@code ADMIN_PANEL_ACCESS} is required for the whole path by {@code SecurityConfig}; each endpoint adds its own
 * permission, resolved from the caller's role on every request. Rules that depend on the target user or role
 * (no privilege escalation, protected and own accounts) are enforced in {@link AdminUserService}.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin users", description = "List, view, create, edit and delete user accounts")
@RequiredArgsConstructor
public class AdminUserController {

	private final AdminUserService userService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List users", description = """
			Filters: search (name, email or >= 3 phone digits), status, userType (role slug), createdFrom/createdTo \
			(ISO dates, inclusive, UTC). Sort by createdAt (default, descending), updatedAt, fullName, email, \
			userType, status or id; id always breaks ties.""")
	@GetMapping
	@PreAuthorize("hasAuthority('USER_LIST')")
	public PageResponse<ManagedUserResponse> list(@Valid ManagedUserFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return userService.list(filter, pageable);
	}

	@Operation(summary = "User counts", description = "Non-deleted users in total and per status; ignores list filters.")
	@GetMapping("/stats")
	@PreAuthorize("hasAuthority('USER_LIST')")
	public UserStatsResponse stats() {
		return userService.stats();
	}

	@Operation(summary = "Role options", description = """
			Every non-deleted role (users.user_type = roles.slug) for filters and forms, with whether the caller \
			may assign it.""")
	@GetMapping("/roles")
	@PreAuthorize("hasAnyAuthority('USER_LIST', 'USER_CREATE', 'USER_UPDATE')")
	public List<UserRoleOptionResponse> roles(CurrentActor actor) {
		return userService.roleOptions(actor);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('USER_VIEW')")
	public ManagedUserResponse get(@PathVariable Long id) {
		return userService.get(id);
	}

	@Operation(summary = "Create a user", description = """
			JSON: fullName, email, phone (optional), password, passwordConfirmation, userType (an assignable role \
			slug), status (pending by default; others need USER_CHANGE_STATUS). Unknown fields are rejected.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('USER_CREATE')")
	public ManagedUserResponse create(CurrentActor actor, @Valid @RequestBody CreateManagedUserRequest request) {
		acquireWriteLimit(actor);
		return userService.create(request, actor);
	}

	@Operation(summary = "Edit a user", description = """
			Partial update of fullName, email, phone (null clears), userType and status (needs USER_CHANGE_STATUS). \
			Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('USER_UPDATE')")
	public ManagedUserResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateManagedUserRequest request) {
		acquireWriteLimit(actor);
		return userService.update(id, request, actor);
	}

	@Operation(summary = "Delete a user", description = "Soft delete; ends the user's sessions. 404 when already deleted.")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('USER_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		userService.delete(id, actor);
		return ResponseEntity.noContent().build();
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("user:write:user:" + actor.userId(), limits.userManagementWriteUser());
	}

}
