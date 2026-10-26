package com.propertypro.property_platform.cms.blog.api;

import com.propertypro.property_platform.cms.blog.dto.PublicBlogCategoryResponse;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogSummaryResponse;
import com.propertypro.property_platform.cms.blog.service.PublicBlogService;
import com.propertypro.property_platform.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Active blog categories and their published blogs, without login. Inactive or deleted ones are 404. */
@RestController
@RequestMapping(path = "/api/v1/public/blog-categories", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public blog categories", description = "Active categories only; no authentication")
@RequiredArgsConstructor
public class PublicBlogCategoryController {

	private final PublicBlogService blogService;

	@Operation(summary = "Active categories", description = "By title; page (zero-based) and size (default 20, max 100).")
	@GetMapping
	public ResponseEntity<PageResponse<PublicBlogCategoryResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
		return PublicBlogController.cached(blogService.listCategories(pageable));
	}

	@Operation(summary = "Published blogs of a category", description = """
			Same rules and order as GET /api/v1/public/blogs; 404 when the category is unknown, inactive or deleted.""")
	@GetMapping("/{slug}/blogs")
	public ResponseEntity<PageResponse<PublicBlogSummaryResponse>> blogs(@PathVariable String slug,
			@PageableDefault(size = 20) Pageable pageable) {
		return PublicBlogController.cached(blogService.listByCategory(slug, pageable));
	}

	@Operation(summary = "Category image", description = "The imageUrl of an active category.")
	@GetMapping(path = "/{slug}/image/{fileName}", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> image(@PathVariable String slug, @PathVariable String fileName) {
		return BlogImages.response(blogService.categoryImage(slug, fileName), true);
	}

}
