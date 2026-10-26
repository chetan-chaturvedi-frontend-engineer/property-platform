package com.propertypro.property_platform.cms.faq.api;

import com.propertypro.property_platform.cms.faq.dto.FaqCategoryResponse;
import com.propertypro.property_platform.cms.faq.dto.PublicFaqFilter;
import com.propertypro.property_platform.cms.faq.dto.PublicFaqResponse;
import com.propertypro.property_platform.cms.faq.service.PublicFaqService;
import com.propertypro.property_platform.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
import java.util.List;

/** Published FAQs and the configured categories for the mobile app and website, without login. */
@RestController
@RequestMapping(path = "/api/v1/public", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public FAQs", description = "Published FAQs only; no authentication")
@RequiredArgsConstructor
public class PublicFaqController {

	/** Short, so publishing, unpublishing, edits and deletion reach clients within a minute. */
	static final Duration MAX_AGE = Duration.ofSeconds(60);

	private final PublicFaqService faqService;

	@Operation(summary = "Published FAQs", description = """
			Published FAQs of configured categories only. Optional category (key) and search (question or answer) \
			filters; page (zero-based) and size (default 20, max 100). Ordered by sortOrder, then id; sort and \
			other parameters are ignored.""")
	@GetMapping("/faqs")
	public ResponseEntity<PageResponse<PublicFaqResponse>> list(@Valid PublicFaqFilter filter,
			@PageableDefault(size = 20) Pageable pageable) {
		return cached(faqService.list(filter, pageable));
	}

	@Operation(summary = "A published FAQ", description = "404 unless the FAQ is published and its category is configured.")
	@GetMapping("/faqs/{id}")
	public ResponseEntity<PublicFaqResponse> get(@PathVariable Long id) {
		return cached(faqService.get(id));
	}

	/** A short, fixed list from configuration, so it is not paginated. */
	@Operation(summary = "FAQ categories", description = "Configured categories (key and label) in display order.")
	@GetMapping("/faq-categories")
	public ResponseEntity<List<FaqCategoryResponse>> categories() {
		return cached(faqService.categories());
	}

	private static <T> ResponseEntity<T> cached(T body) {
		return ResponseEntity.ok().cacheControl(CacheControl.maxAge(MAX_AGE).cachePublic()).body(body);
	}

}
