package com.propertypro.property_platform.cms.page.api;

import com.propertypro.property_platform.cms.page.dto.PublicPageResponse;
import com.propertypro.property_platform.cms.page.dto.PublicPageSummaryResponse;
import com.propertypro.property_platform.cms.page.service.PublicPageService;
import com.propertypro.property_platform.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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

/** Published content pages for the mobile app and website, without login. */
@RestController
@RequestMapping(path = "/api/v1/public/pages", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public pages", description = "Published pages only; no authentication")
@RequiredArgsConstructor
public class PublicPageController {

	/** Short, so publishing, unpublishing, edits and deletion reach clients within a minute. */
	static final Duration MAX_AGE = Duration.ofSeconds(60);

	private final PublicPageService pageService;

	@Operation(summary = "Published pages", description = """
			Heading, sub heading and slug of published pages, ordered by heading, then id; page (zero-based) and \
			size (default 20, max 100). Sort and other parameters are ignored.""")
	@GetMapping
	public ResponseEntity<PageResponse<PublicPageSummaryResponse>> list(@PageableDefault(size = 20) Pageable pageable) {
		return cached(pageService.list(pageable));
	}

	@Operation(summary = "A published page", description = "404 unless a published page has this slug.")
	@GetMapping("/{slug}")
	public ResponseEntity<PublicPageResponse> get(@PathVariable String slug) {
		return cached(pageService.get(slug));
	}

	private static <T> ResponseEntity<T> cached(T body) {
		return ResponseEntity.ok().cacheControl(CacheControl.maxAge(MAX_AGE).cachePublic()).body(body);
	}

}
