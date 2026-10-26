package com.propertypro.property_platform.cms.banner.api;

import com.propertypro.property_platform.cms.banner.dto.PublicBannerFilter;
import com.propertypro.property_platform.cms.banner.dto.PublicBannerResponse;
import com.propertypro.property_platform.cms.banner.service.BannerService;
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

/** Live banners for the mobile app and website, without login. Anything not live is hidden (404). */
@RestController
@RequestMapping(path = "/api/v1/public/banners", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public banners", description = "Live banners only; no authentication")
@RequiredArgsConstructor
public class PublicBannerController {

	/** Short, so activation, expiry and deletion reach clients within a minute. */
	static final Duration LIST_MAX_AGE = Duration.ofSeconds(60);

	private final BannerService bannerService;

	@Operation(summary = "Live banners", description = """
			Active, not deleted, and now within startDate..endDate (inclusive; a missing bound is open). Optional \
			placement filter; page (zero-based) and size (default 20, max 100). Ordered by placement, then newest \
			first; sort parameters are ignored.""")
	@GetMapping
	public ResponseEntity<PageResponse<PublicBannerResponse>> list(@Valid PublicBannerFilter filter,
			@PageableDefault(size = 20) Pageable pageable) {
		return ResponseEntity.ok()
			.cacheControl(CacheControl.maxAge(LIST_MAX_AGE).cachePublic())
			.body(bannerService.listLive(filter, pageable));
	}

	@Operation(summary = "Banner image", description = "The imageUrl of a live banner.")
	@GetMapping(path = "/{id}/image/{fileName}", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> image(@PathVariable Long id, @PathVariable String fileName) {
		return BannerImages.response(bannerService.liveImage(id, fileName), true);
	}

}
