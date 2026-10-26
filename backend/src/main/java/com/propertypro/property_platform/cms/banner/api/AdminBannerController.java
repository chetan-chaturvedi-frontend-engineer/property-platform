package com.propertypro.property_platform.cms.banner.api;

import com.propertypro.property_platform.cms.banner.dto.BannerFilter;
import com.propertypro.property_platform.cms.banner.dto.BannerResponse;
import com.propertypro.property_platform.cms.banner.dto.CreateBannerForm;
import com.propertypro.property_platform.cms.banner.dto.UpdateBannerRequest;
import com.propertypro.property_platform.cms.banner.service.BannerService;
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
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Banner management for the admin dashboard: every non-deleted banner in every state.
 * {@code ADMIN_PANEL_ACCESS} is required for the whole path by {@code SecurityConfig}; each endpoint
 * adds its own permission, resolved from the user's role on every request.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/banners", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin banners", description = "Create, list, edit and soft-delete banners")
@RequiredArgsConstructor
public class AdminBannerController {

	private final BannerService bannerService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a banner", description = """
			multipart/form-data: image (JPEG, PNG or WebP, max 10 MB; type checked by content) plus title, type, \
			placement, optional linkType + link, status (default inactive; other values need \
			BANNER_CHANGE_STATUS), startDate, endDate (ISO-8601 instants, inclusive).""")
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('BANNER_CREATE')")
	public BannerResponse create(CurrentActor actor, @RequestPart(name = "image", required = false) MultipartFile image,
			@Valid @ModelAttribute CreateBannerForm form) {
		rateLimiter.acquire("banner:write:user:" + actor.userId(), limits.bannerWriteUser());
		return bannerService.create(form, image, actor);
	}

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List banners", description = """
			Sort by createdAt (default, newest first), updatedAt, title, type, placement, status, startDate or \
			endDate. Soft-deleted banners are never listed.""")
	@GetMapping
	@PreAuthorize("hasAuthority('BANNER_LIST')")
	public PageResponse<BannerResponse> list(@Valid BannerFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return bannerService.list(filter, pageable);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('BANNER_VIEW')")
	public BannerResponse get(@PathVariable Long id) {
		return bannerService.get(id);
	}

	@Operation(summary = "Edit a banner", description = """
			Partial update: omitted fields are kept, null clears linkType, link, startDate and endDate. \
			Changing status also needs BANNER_CHANGE_STATUS. Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('BANNER_UPDATE')")
	public BannerResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateBannerRequest request) {
		rateLimiter.acquire("banner:write:user:" + actor.userId(), limits.bannerWriteUser());
		return bannerService.update(id, request, actor);
	}

	@Operation(summary = "Replace the image", description = "multipart/form-data with image; same rules as create.")
	@PutMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('BANNER_UPDATE')")
	public BannerResponse replaceImage(CurrentActor actor, @PathVariable Long id,
			@RequestPart(name = "image", required = false) MultipartFile image) {
		rateLimiter.acquire("banner:write:user:" + actor.userId(), limits.bannerWriteUser());
		return bannerService.replaceImage(id, image);
	}

	@Operation(summary = "Soft-delete a banner", description = "Hidden everywhere afterwards; the row and image are kept.")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('BANNER_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("banner:write:user:" + actor.userId(), limits.bannerWriteUser());
		bannerService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Download the image", description = "The imageUrl of a banner response.")
	@GetMapping(path = "/{id}/image/{fileName}", produces = MediaType.ALL_VALUE)
	@PreAuthorize("hasAuthority('BANNER_VIEW')")
	public ResponseEntity<Resource> image(@PathVariable Long id, @PathVariable String fileName) {
		return BannerImages.response(bannerService.image(id, fileName), false);
	}

}
