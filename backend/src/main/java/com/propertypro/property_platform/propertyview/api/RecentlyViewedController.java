package com.propertypro.property_platform.propertyview.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.propertyview.service.PropertyViewService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The caller's recently viewed properties (mobile app). The owner always comes from the token. */
@RestController
@RequestMapping(path = "/api/v1/recently-viewed", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Recently viewed", description = "The caller's viewing history")
@Validated
@RequiredArgsConstructor
public class RecentlyViewedController {

	private final PropertyViewService propertyViewService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Recently viewed (RECENTLY_VIEWED_LIST)", description = """
			Up to 50 public properties as cards, most recently viewed first. A plain array, not paginated.""")
	@GetMapping
	public List<PublicPropertySummaryResponse> recent(CurrentActor actor) {
		return propertyViewService.recent(actor);
	}

	@Operation(summary = "Record a view (RECENTLY_VIEWED_CREATE)", description = """
			Counts one view of the property and moves it to the top. 404 unless the property is published.""")
	@PostMapping("/{propertyId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void record(CurrentActor actor, @PathVariable @Positive Long propertyId) {
		rateLimiter.acquire("property-view:write:user:" + actor.userId(), limits.propertyViewWriteUser());
		propertyViewService.record(actor, propertyId);
	}

	@Operation(summary = "Clear my history (RECENTLY_VIEWED_DELETE)", description = "Idempotent.")
	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void clear(CurrentActor actor) {
		rateLimiter.acquire("property-view:write:user:" + actor.userId(), limits.propertyViewWriteUser());
		propertyViewService.clear(actor);
	}

}
