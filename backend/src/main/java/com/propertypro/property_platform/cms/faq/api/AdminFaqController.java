package com.propertypro.property_platform.cms.faq.api;

import com.propertypro.property_platform.cms.faq.dto.CreateFaqRequest;
import com.propertypro.property_platform.cms.faq.dto.FaqFilter;
import com.propertypro.property_platform.cms.faq.dto.FaqResponse;
import com.propertypro.property_platform.cms.faq.dto.FaqSummaryResponse;
import com.propertypro.property_platform.cms.faq.dto.UpdateFaqRequest;
import com.propertypro.property_platform.cms.faq.service.FaqService;
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
 * FAQ management for the admin dashboard: every FAQ, drafts included. {@code ADMIN_PANEL_ACCESS} is
 * required for the whole path by {@code SecurityConfig}; each endpoint adds its own permission,
 * resolved from the user's role on every request. Categories for the form come from
 * {@code GET /api/v1/public/faq-categories}.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/faqs", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin FAQs", description = "Create, list, edit, publish and delete FAQs")
@RequiredArgsConstructor
public class AdminFaqController {

	private final FaqService faqService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a FAQ", description = """
			JSON: question, answer (HTML, sanitized), category (a configured key), status (draft by default; \
			publish also needs FAQ_PUBLISH), sortOrder (0 by default). Unknown fields are rejected.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('FAQ_CREATE')")
	public FaqResponse create(CurrentActor actor, @Valid @RequestBody CreateFaqRequest request) {
		acquireWriteLimit(actor);
		return faqService.create(request, actor);
	}

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List FAQs", description = """
			Drafts and published FAQs, without the answer. Sort by sortOrder (default, ascending), question, \
			category, status, createdAt, updatedAt or id; id always breaks ties.""")
	@GetMapping
	@PreAuthorize("hasAuthority('FAQ_VIEW')")
	public PageResponse<FaqSummaryResponse> list(@Valid FaqFilter filter,
			@SortDefault(sort = "sortOrder", direction = Sort.Direction.ASC) Pageable pageable) {
		return faqService.list(filter, pageable);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('FAQ_VIEW')")
	public FaqResponse get(@PathVariable Long id) {
		return faqService.get(id);
	}

	@Operation(summary = "Edit a FAQ", description = """
			Partial update: omitted fields are kept, null is rejected. Changing status also needs FAQ_PUBLISH. \
			Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('FAQ_UPDATE')")
	public FaqResponse update(CurrentActor actor, @PathVariable Long id, @Valid @RequestBody UpdateFaqRequest request) {
		acquireWriteLimit(actor);
		return faqService.update(id, request, actor);
	}

	@Operation(summary = "Delete a FAQ", description = "Permanent; 404 when it does not exist (also when already deleted).")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('FAQ_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		faqService.delete(id);
		return ResponseEntity.noContent().build();
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("faq:write:user:" + actor.userId(), limits.faqWriteUser());
	}

}
