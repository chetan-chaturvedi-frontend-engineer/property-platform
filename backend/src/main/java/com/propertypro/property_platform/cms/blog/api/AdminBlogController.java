package com.propertypro.property_platform.cms.blog.api;

import com.propertypro.property_platform.cms.blog.dto.BlogFilter;
import com.propertypro.property_platform.cms.blog.dto.BlogResponse;
import com.propertypro.property_platform.cms.blog.dto.BlogSummaryResponse;
import com.propertypro.property_platform.cms.blog.dto.CreateBlogForm;
import com.propertypro.property_platform.cms.blog.dto.UpdateBlogRequest;
import com.propertypro.property_platform.cms.blog.service.BlogService;
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
 * Blog management for the admin dashboard: every non-deleted blog, drafts and scheduled ones included.
 * {@code ADMIN_PANEL_ACCESS} is required for the whole path by {@code SecurityConfig}; each endpoint
 * adds its own permission, resolved from the user's role on every request.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/blogs", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin blogs", description = "Create, list, edit, publish and soft-delete blogs")
@RequiredArgsConstructor
public class AdminBlogController {

	private final BlogService blogService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a blog", description = """
			multipart/form-data: title, content (HTML, sanitized), optional slug (generated from the title when \
			omitted), categoryId (required to publish), shortDescription, status (draft by default, or publish), \
			publishedAt (publish: default now, future = scheduled), metaTitle, metaDescription, tags (repeat the \
			field), and an optional featureImage (JPEG, PNG or WebP, max 10 MB; type checked by content).""")
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('BLOG_CREATE')")
	public BlogResponse create(CurrentActor actor,
			@RequestPart(name = "featureImage", required = false) MultipartFile featureImage,
			@Valid @ModelAttribute CreateBlogForm form) {
		acquireWriteLimit(actor);
		return blogService.create(form, featureImage);
	}

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List blogs", description = """
			Drafts, scheduled and published blogs; never soft-deleted ones. Items have no content. Sort by \
			createdAt (default, newest first), updatedAt, publishedAt, title, slug, status or id.""")
	@GetMapping
	@PreAuthorize("hasAuthority('BLOG_VIEW')")
	public PageResponse<BlogSummaryResponse> list(@Valid BlogFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return blogService.list(filter, pageable);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('BLOG_VIEW')")
	public BlogResponse get(@PathVariable Long id) {
		return blogService.get(id);
	}

	@Operation(summary = "Edit a blog", description = """
			Partial update: omitted fields are kept. status draft unpublishes; publish needs a category and \
			publishes a draft now unless publishedAt is sent (future = scheduled). A new title keeps the slug; \
			send slug to change the URL. Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('BLOG_UPDATE')")
	public BlogResponse update(CurrentActor actor, @PathVariable Long id, @Valid @RequestBody UpdateBlogRequest request) {
		acquireWriteLimit(actor);
		return blogService.update(id, request);
	}

	@Operation(summary = "Replace the feature image", description = "multipart/form-data with featureImage; same rules as create.")
	@PutMapping(path = "/{id}/feature-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('BLOG_UPDATE')")
	public BlogResponse replaceFeatureImage(CurrentActor actor, @PathVariable Long id,
			@RequestPart(name = "featureImage", required = false) MultipartFile featureImage) {
		acquireWriteLimit(actor);
		return blogService.replaceFeatureImage(id, featureImage);
	}

	@Operation(summary = "Remove the feature image")
	@DeleteMapping("/{id}/feature-image")
	@PreAuthorize("hasAuthority('BLOG_UPDATE')")
	public BlogResponse removeFeatureImage(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		return blogService.removeFeatureImage(id);
	}

	@Operation(summary = "Soft-delete a blog", description = "Hidden everywhere afterwards; the row, image and slug are kept.")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('BLOG_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		blogService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Download the feature image", description = "The featureImageUrl of an admin blog response.")
	@GetMapping(path = "/{id}/feature-image/{fileName}", produces = MediaType.ALL_VALUE)
	@PreAuthorize("hasAuthority('BLOG_VIEW')")
	public ResponseEntity<Resource> featureImage(@PathVariable Long id, @PathVariable String fileName) {
		return BlogImages.response(blogService.featureImage(id, fileName), false);
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("blog:write:user:" + actor.userId(), limits.blogWriteUser());
	}

}
