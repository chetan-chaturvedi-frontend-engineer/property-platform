package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.CreateInteractionRequest;
import com.propertypro.property_platform.lead.dto.InteractionFilter;
import com.propertypro.property_platform.lead.dto.InteractionResponse;
import com.propertypro.property_platform.lead.dto.UpdateInteractionRequest;
import com.propertypro.property_platform.lead.service.LeadInteractionService;
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
 * Communication history of a lead. The lead must be viewable by the caller (404 otherwise) and each
 * endpoint needs its {@code LEAD_INTERACTION_*} permission (403 otherwise).
 */
@RestController
@RequestMapping(path = "/api/v1/leads/{leadId}/interactions", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Lead interactions", description = "Calls, messages, meetings and notes of a lead")
@RequiredArgsConstructor
public class LeadInteractionController {

	private final LeadInteractionService interactionService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Interaction history (LEAD_INTERACTION_VIEW)", description = """
			Optional type filter. Sort by interactionAt (default, newest first) or createdAt.""")
	@GetMapping
	public PageResponse<InteractionResponse> list(CurrentActor actor, @PathVariable Long leadId,
			@Valid InteractionFilter filter,
			@SortDefault(sort = "interactionAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return interactionService.list(leadId, actor, filter.type(), pageable);
	}

	@GetMapping("/{interactionId}")
	public InteractionResponse get(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long interactionId) {
		return interactionService.get(leadId, interactionId, actor);
	}

	@Operation(summary = "Record an interaction (LEAD_INTERACTION_CREATE)", description = """
			The caller becomes interactedBy. Updates the lead's lastContactedAt (notes excluded) and, when \
			given, its nextFollowUpAt.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public InteractionResponse create(CurrentActor actor, @PathVariable Long leadId,
			@Valid @RequestBody CreateInteractionRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return interactionService.create(leadId, actor, request);
	}

	@PatchMapping(path = "/{interactionId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Edit an interaction (LEAD_INTERACTION_UPDATE)")
	public InteractionResponse update(CurrentActor actor, @PathVariable Long leadId, @PathVariable Long interactionId,
			@Valid @RequestBody UpdateInteractionRequest request) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		return interactionService.update(leadId, interactionId, actor, request);
	}

	@Operation(summary = "Delete (soft delete, LEAD_INTERACTION_DELETE)")
	@DeleteMapping("/{interactionId}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long leadId,
			@PathVariable Long interactionId) {
		rateLimiter.acquire("lead:write:user:" + actor.userId(), limits.leadWriteUser());
		interactionService.delete(leadId, interactionId, actor);
		return ResponseEntity.noContent().build();
	}

}
