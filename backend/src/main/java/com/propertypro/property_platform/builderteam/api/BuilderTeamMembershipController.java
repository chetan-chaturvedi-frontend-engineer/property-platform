package com.propertypro.property_platform.builderteam.api;

import com.propertypro.property_platform.builderteam.dto.BuilderTeamMemberResponse;
import com.propertypro.property_platform.builderteam.dto.MyMembershipFilter;
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
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The caller's own memberships in other builders' teams (mobile app): invitations to answer. */
@RestController
@RequestMapping(path = "/api/v1/builder-team-memberships", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Builder team memberships", description = "The caller's invitations and memberships")
@RequiredArgsConstructor
public class BuilderTeamMembershipController {

	private final BuilderTeamService builderTeamService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List my memberships (BUILDER_TEAM_MEMBERSHIP_VIEW)", description = """
			status=pending lists open invitations. page (zero-based), size (max 100), sort by createdAt, \
			updatedAt, joinedAt, status or role.""")
	@GetMapping
	public PageResponse<BuilderTeamMemberResponse> list(CurrentActor actor, @Valid MyMembershipFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return builderTeamService.listOwnMemberships(actor, filter, pageable);
	}

	@Operation(summary = "Membership details (BUILDER_TEAM_MEMBERSHIP_VIEW)")
	@GetMapping("/{id}")
	public BuilderTeamMemberResponse get(CurrentActor actor, @PathVariable Long id) {
		return builderTeamService.getOwnMembership(id, actor);
	}

	@Operation(summary = "Accept a pending invitation (BUILDER_TEAM_MEMBERSHIP_RESPOND)")
	@PostMapping("/{id}/accept")
	public BuilderTeamMemberResponse accept(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		return builderTeamService.accept(id, actor);
	}

	@Operation(summary = "Reject a pending invitation (BUILDER_TEAM_MEMBERSHIP_RESPOND)")
	@PostMapping("/{id}/reject")
	public BuilderTeamMemberResponse reject(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("builder-team:write:user:" + actor.userId(), limits.builderTeamWriteUser());
		return builderTeamService.reject(id, actor);
	}

}
