package com.propertypro.property_platform.builderteam.api;

import com.propertypro.property_platform.builderteam.dto.AdminCreateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.dto.BuilderTeamFilter;
import com.propertypro.property_platform.builderteam.dto.BuilderTeamMemberResponse;
import com.propertypro.property_platform.builderteam.dto.UpdateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.service.BuilderTeamService;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
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

/**
 * Admin dashboard: every builder's team. {@code ADMIN_PANEL_ACCESS} is required for the whole path by
 * {@code SecurityConfig}; each endpoint also needs its {@code BUILDER_TEAM_*_ANY} permission.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/builder-teams", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin builder teams", description = "All builder team memberships")
@RequiredArgsConstructor
public class AdminBuilderTeamController {

	private final BuilderTeamService builderTeamService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List all team memberships (BUILDER_TEAM_LIST_ANY)", description = """
			page (zero-based), size (max 100), sort by createdAt, updatedAt, joinedAt, status or role.""")
	@GetMapping
	@PreAuthorize("hasAuthority('BUILDER_TEAM_LIST_ANY')")
	public PageResponse<BuilderTeamMemberResponse> list(CurrentActor actor, @Valid BuilderTeamFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return builderTeamService.listAll(actor, filter, pageable);
	}

	@Operation(summary = "Create a team membership (BUILDER_TEAM_CREATE_ANY)", description = """
			status active also needs BUILDER_TEAM_MANAGE_STATUS; granting permissions needs \
			BUILDER_TEAM_MANAGE_PERMISSIONS. Not gated by the builder's subscription.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('BUILDER_TEAM_CREATE_ANY')")
	public BuilderTeamMemberResponse create(CurrentActor actor,
			@Valid @RequestBody AdminCreateBuilderTeamMemberRequest request) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		return builderTeamService.createAsAdmin(actor, request);
	}

	@Operation(summary = "Team membership details (BUILDER_TEAM_VIEW_ANY)")
	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('BUILDER_TEAM_VIEW_ANY')")
	public BuilderTeamMemberResponse get(CurrentActor actor, @PathVariable Long id) {
		return builderTeamService.getAsAdmin(id, actor);
	}

	@Operation(summary = "Update a team membership (BUILDER_TEAM_UPDATE_ANY)", description = """
			role needs BUILDER_TEAM_ASSIGN_ROLE, permissions BUILDER_TEAM_MANAGE_PERMISSIONS and status \
			BUILDER_TEAM_MANAGE_STATUS. status active also activates a pending invitation.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('BUILDER_TEAM_UPDATE_ANY')")
	public BuilderTeamMemberResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateBuilderTeamMemberRequest request) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		return builderTeamService.update(id, actor, request, true);
	}

	@Operation(summary = "Remove a team membership (soft delete, BUILDER_TEAM_DELETE_ANY)")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('BUILDER_TEAM_DELETE_ANY')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		builderTeamService.delete(id, actor, true);
		return ResponseEntity.noContent().build();
	}

}
