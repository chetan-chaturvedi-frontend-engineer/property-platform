package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.PropertyFilter;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse;
import com.propertypro.property_platform.property.service.PropertyService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.withEtag;

/**
 * Admin dashboard: every owner's properties. {@code ADMIN_PANEL_ACCESS} is required for the whole path
 * by {@code SecurityConfig}; each endpoint adds its own permission. Editing and workflow actions use
 * {@code /api/v1/properties/{id}/...} with the {@code _ANY}, review, publish and suspend permissions.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin properties", description = "All owners' properties, including deleted ones")
@RequiredArgsConstructor
public class AdminPropertyController {

	private final PropertyService propertyService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "List all properties", description = """
			Filters as the owner list plus ownerId and deleted (exclude, only, include). Sort by createdAt, \
			updatedAt, projectName, city or publishedAt.""")
	@GetMapping
	@PreAuthorize("hasAuthority('PROPERTY_LIST_ANY')")
	public PageResponse<PropertySummaryResponse> list(@Valid PropertyFilter filter,
			@SortDefault(sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return propertyService.listAll(filter, pageable);
	}

	@Operation(summary = "Property with owner details and status history actors")
	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
	public ResponseEntity<PropertyResponse> get(CurrentActor actor, @PathVariable Long id) {
		return withEtag(HttpStatus.OK, propertyService.getAsAdmin(id, actor));
	}

	@Operation(summary = "Restore a deleted property", description = """
			The property counts toward its owner's property limit again, so the owner's subscription must have \
			a free slot (403 property_limit_reached otherwise). Its publication status is unchanged.""")
	@PostMapping("/{id}/restore")
	@PreAuthorize("hasAuthority('PROPERTY_RESTORE_ANY')")
	public ResponseEntity<PropertyResponse> restore(CurrentActor actor, @PathVariable Long id) {
		rateLimiter.acquire("property:status:user:" + actor.userId(), limits.propertyStatusUser());
		return withEtag(HttpStatus.OK, propertyService.restore(id, actor));
	}

}
