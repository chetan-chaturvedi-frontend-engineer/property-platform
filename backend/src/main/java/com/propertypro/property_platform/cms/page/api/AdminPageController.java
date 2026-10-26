package com.propertypro.property_platform.cms.page.api;

import com.propertypro.property_platform.cms.page.dto.AdminPageResponse;
import com.propertypro.property_platform.cms.page.dto.CreatePageRequest;
import com.propertypro.property_platform.cms.page.dto.PageFilter;
import com.propertypro.property_platform.cms.page.dto.PageSummaryResponse;
import com.propertypro.property_platform.cms.page.dto.UpdatePageRequest;
import com.propertypro.property_platform.cms.page.service.PageService;
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
 * Content page management for the admin dashboard: every page, drafts included. {@code ADMIN_PANEL_ACCESS}
 * is required for the whole path by {@code SecurityConfig}; each endpoint adds its own permission,
 * resolved from the user's role on every request.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/pages", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin pages", description = "Create, list, edit, publish and delete content pages")
@RequiredArgsConstructor
public class AdminPageController {

	private final PageService pageService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a page", description = """
			JSON: heading, subHeading, slug (generated from the heading when omitted), content (HTML, sanitized), \
			type (static by default), status (draft by default; publish also needs PAGE_PUBLISH), metaTitle, \
			metaDescription, metaKeywords. Unknown fields are rejected.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('PAGE_CREATE')")
	public AdminPageResponse create(CurrentActor actor, @Valid @RequestBody CreatePageRequest request) {
		acquireWriteLimit(actor);
		return pageService.create(request, actor);
	}

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List pages", description = """
			Drafts and published pages, without content or SEO fields. Sort by createdAt (default, descending), \
			heading, slug, type, status, updatedAt or id; id always breaks ties.""")
	@GetMapping
	@PreAuthorize("hasAuthority('PAGE_VIEW')")
	public PageResponse<PageSummaryResponse> list(@Valid PageFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return pageService.list(filter, pageable);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('PAGE_VIEW')")
	public AdminPageResponse get(@PathVariable Long id) {
		return pageService.get(id);
	}

	@Operation(summary = "Edit a page", description = """
			Partial update: omitted fields are kept; null clears subHeading and the meta fields and is rejected \
			for the others. Changing status also needs PAGE_PUBLISH. Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('PAGE_UPDATE')")
	public AdminPageResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdatePageRequest request) {
		acquireWriteLimit(actor);
		return pageService.update(id, request, actor);
	}

	@Operation(summary = "Delete a page", description = "Permanent; 404 when it does not exist (also when already deleted).")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('PAGE_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		pageService.delete(id);
		return ResponseEntity.noContent().build();
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("page:write:user:" + actor.userId(), limits.pageWriteUser());
	}

}
