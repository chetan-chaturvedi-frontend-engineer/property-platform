package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.property.dto.PublicPropertyFilter;
import com.propertypro.property_platform.property.dto.PublicPropertyResponse;
import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.property.service.PublicPropertyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Published properties for the website and app, without login. Anything not published is 404. */
@RestController
@RequestMapping(path = "/api/v1/public/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Public properties", description = "Published properties only; no authentication")
@RequiredArgsConstructor
public class PublicPropertyController {

	private final PublicPropertyService publicPropertyService;

	@Operation(summary = "Search published properties", description = "Sort by publishedAt, projectName or city.")
	@GetMapping
	public PageResponse<PublicPropertySummaryResponse> list(@Valid PublicPropertyFilter filter,
			@SortDefault(sort = "publishedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return publicPropertyService.list(filter, pageable);
	}

	@GetMapping("/{slug}")
	public PublicPropertyResponse get(@PathVariable String slug) {
		return publicPropertyService.get(slug);
	}

	@GetMapping(path = "/{slug}/media/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> media(@PathVariable String slug, @PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(publicPropertyService.projectMediaContent(slug, mediaId), true);
	}

	@GetMapping(path = "/{slug}/apartments/{apartmentId}/media/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> apartmentMedia(@PathVariable String slug, @PathVariable Long apartmentId,
			@PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(publicPropertyService.apartmentMediaContent(slug, apartmentId, mediaId), true);
	}

}
