package com.propertypro.property_platform.cms.blog.api;

import com.propertypro.property_platform.cms.blog.dto.BlogCategoryFilter;
import com.propertypro.property_platform.cms.blog.dto.BlogCategoryResponse;
import com.propertypro.property_platform.cms.blog.dto.CreateBlogCategoryForm;
import com.propertypro.property_platform.cms.blog.dto.UpdateBlogCategoryRequest;
import com.propertypro.property_platform.cms.blog.service.BlogCategoryService;
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
 * Blog category management for the admin dashboard: every non-deleted category, active or not.
 * {@code ADMIN_PANEL_ACCESS} is required for the whole path by {@code SecurityConfig}; each endpoint
 * adds its own permission, resolved from the user's role on every request.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/blog-categories", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin blog categories", description = "Create, list, edit and soft-delete blog categories")
@RequiredArgsConstructor
public class AdminBlogCategoryController {

	private final BlogCategoryService categoryService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Create a blog category", description = """
			multipart/form-data: title, optional slug (generated from the title when omitted), icon, status \
			(default active), metaTitle, metaDescription, and an optional image (JPEG, PNG or WebP, max 10 MB; \
			type checked by content).""")
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_CREATE')")
	public BlogCategoryResponse create(CurrentActor actor,
			@RequestPart(name = "image", required = false) MultipartFile image,
			@Valid @ModelAttribute CreateBlogCategoryForm form) {
		acquireWriteLimit(actor);
		return categoryService.create(form, image);
	}

	/** {@code page} (zero-based), {@code size} (default 20, max 100) and {@code sort}, plus the filter parameters. */
	@Operation(summary = "List blog categories", description = """
			Sort by createdAt (default, newest first), updatedAt, title, slug, status or id. Soft-deleted \
			categories are never listed.""")
	@GetMapping
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
	public PageResponse<BlogCategoryResponse> list(@Valid BlogCategoryFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return categoryService.list(filter, pageable);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
	public BlogCategoryResponse get(@PathVariable Long id) {
		return categoryService.get(id);
	}

	@Operation(summary = "Edit a blog category", description = """
			Partial update: omitted fields are kept, null clears icon, metaTitle and metaDescription. A new \
			title keeps the slug; send slug to change the URL. Unknown or protected fields are rejected.""")
	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_UPDATE')")
	public BlogCategoryResponse update(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody UpdateBlogCategoryRequest request) {
		acquireWriteLimit(actor);
		return categoryService.update(id, request);
	}

	@Operation(summary = "Replace the image", description = "multipart/form-data with image; same rules as create.")
	@PutMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_UPDATE')")
	public BlogCategoryResponse replaceImage(CurrentActor actor, @PathVariable Long id,
			@RequestPart(name = "image", required = false) MultipartFile image) {
		acquireWriteLimit(actor);
		return categoryService.replaceImage(id, image);
	}

	@Operation(summary = "Remove the image")
	@DeleteMapping("/{id}/image")
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_UPDATE')")
	public BlogCategoryResponse removeImage(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		return categoryService.removeImage(id);
	}

	@Operation(summary = "Soft-delete a blog category", description = """
			Refused with 409 blog_category_in_use while any non-deleted blog uses the category. The row and \
			image are kept; the slug stays reserved.""")
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_DELETE')")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long id) {
		acquireWriteLimit(actor);
		categoryService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Download the image", description = "The imageUrl of a blog category response.")
	@GetMapping(path = "/{id}/image/{fileName}", produces = MediaType.ALL_VALUE)
	@PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
	public ResponseEntity<Resource> image(@PathVariable Long id, @PathVariable String fileName) {
		return BlogImages.response(categoryService.image(id, fileName), false);
	}

	private void acquireWriteLimit(CurrentActor actor) {
		rateLimiter.acquire("blog-category:write:user:" + actor.userId(), limits.blogCategoryWriteUser());
	}

}
