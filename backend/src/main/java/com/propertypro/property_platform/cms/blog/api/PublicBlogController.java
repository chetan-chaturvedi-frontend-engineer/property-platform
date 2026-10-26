package com.propertypro.property_platform.cms.blog.api;

import com.propertypro.property_platform.cms.blog.dto.PublicBlogFilter;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogResponse;
import com.propertypro.property_platform.cms.blog.dto.PublicBlogSummaryResponse;
import com.propertypro.property_platform.cms.blog.service.PublicBlogService;
import com.propertypro.property_platform.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Published blogs for the mobile app and website, without login. Anything not public is hidden (404). */
@RestController
@RequestMapping(path = "/api/v1/public/blogs", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public blogs", description = "Publicly visible blogs only; no authentication")
@RequiredArgsConstructor
public class PublicBlogController {

	/** Short, so publishing, unpublishing, scheduled times and deletion reach clients within a minute. */
	static final Duration MAX_AGE = Duration.ofSeconds(60);

	private final PublicBlogService blogService;

	@Operation(summary = "Published blogs", description = """
			Published, publishedAt reached (server time), not deleted, in an active category. Optional search \
			(title or short description), category (slug) and tag filters; page (zero-based) and size (default 20, \
			max 100). Newest publication first; sort and other parameters are ignored.""")
	@GetMapping
	public ResponseEntity<PageResponse<PublicBlogSummaryResponse>> list(@Valid PublicBlogFilter filter,
			@PageableDefault(size = 20) Pageable pageable) {
		return cached(blogService.list(filter, pageable));
	}

	@Operation(summary = "A published blog by slug", description = "404 unless the blog is publicly visible right now.")
	@GetMapping("/{slug}")
	public ResponseEntity<PublicBlogResponse> get(@PathVariable String slug) {
		return cached(blogService.get(slug));
	}

	@Operation(summary = "Feature image", description = "The featureImageUrl of a publicly visible blog.")
	@GetMapping(path = "/{slug}/feature-image/{fileName}", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> featureImage(@PathVariable String slug, @PathVariable String fileName) {
		return BlogImages.response(blogService.featureImage(slug, fileName), true);
	}

	static <T> ResponseEntity<T> cached(T body) {
		return ResponseEntity.ok().cacheControl(CacheControl.maxAge(MAX_AGE).cachePublic()).body(body);
	}

}
