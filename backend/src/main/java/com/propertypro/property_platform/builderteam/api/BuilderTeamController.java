package com.propertypro.property_platform.builderteam.api;

import com.propertypro.property_platform.builderteam.dto.BuilderTeamMemberResponse;
import com.propertypro.property_platform.builderteam.dto.CreateBuilderTeamMemberRequest;
import com.propertypro.property_platform.builderteam.dto.MyBuilderTeamFilter;
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
 * The caller's own builder team (mobile app): memberships whose builder is the caller; others' are 404.
 * The builder always comes from the token. Admin permissions are never used here.
 */
@RestController
@RequestMapping(path = "/api/v1/builder-teams", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Builder team", description = "Managing the caller's own team")
@RequiredArgsConstructor
public class BuilderTeamController {

	private final BuilderTeamService builderTeamService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Invite a team member (BUILDER_TEAM_CREATE)", description = """
			The employee is the active, verified account with the given email or phone. Needs a subscription with \
			a free team seat; granting permissions also needs BUILDER_TEAM_MANAGE_PERMISSIONS. Created as pending.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public BuilderTeamMemberResponse invite(CurrentActor actor,
			@Valid @RequestBody CreateBuilderTeamMemberRequest request) {
		rateLimiter.acquire("builder-team:create:user:" + actor.userId(), limits.builderTeamCreateUser());
		return builderTeamService.invite(actor, request);
	}

	@Operation(summary = "List my team (BUILDER_TEAM_LIST)", description = """
			page (zero-based), size (max 100), sort by createdAt, updatedAt, joinedAt, status or role.""")
	@GetMapping
	public PageResponse<BuilderTeamMemberResponse> list(CurrentActor actor, @Valid MyBuilderTeamFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return builderTeamService.listOwnTeam(actor, filter, pageable);
	}

	@Operation(summary = "Team member details (BUILDER_TEAM_VIEW)")
	@GetMapping("/{id}")
	public BuilderTeamMemberResponse get(CurrentActor actor, @PathVariable Long id) {
		return builderTeamService.getOwnTeamMember(id, actor);
	}

	@Operation(summary = "Update a team member (BUILDER_TEAM_UPDATE)", description = """
			role needs BUILDER_TEAM_ASSIGN_ROLE, permissions BUILDER_TEAM_MANAGE_PERMISSIONS and status \
			BUILDER_TEAM_MANAGE_STATUS. status: inactive, revoked, or active to reactivate an inactive member \
			(needs a free seat). Role and permission changes need a subscription that includes team management.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public BuilderTeamMemberResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateBuilderTeamMemberRequest request) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		return builderTeamService.update(id, actor, request, false);
	}

	@Operation(summary = "Remove a team member (BUILDER_TEAM_DELETE)", description = """
			Revokes and soft-deletes the membership; allowed without a subscription.""")
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		builderTeamService.delete(id, actor, false);
		return ResponseEntity.noContent().build();
	}

}
