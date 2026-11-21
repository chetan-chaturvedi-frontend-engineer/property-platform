package com.propertypro.property_platform.savedproperty.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.savedproperty.service.SavedPropertyService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The caller's shortlist (mobile app). There is no user id in the path: the owner always comes from the token. */
@RestController
@RequestMapping(path = "/api/v1/saved-properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Saved properties", description = "The caller's shortlist")
@Validated
@RequiredArgsConstructor
public class SavedPropertyController {

	private final SavedPropertyService savedPropertyService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "My shortlist (SAVED_PROPERTY_LIST)", description = """
			Saved properties as public property cards, newest saved first; properties that are no longer public are \
			skipped. page (zero-based) and size (max 100).""")
	@GetMapping
	public PageResponse<PublicPropertySummaryResponse> list(CurrentActor actor, Pageable pageable) {
		return savedPropertyService.list(actor, pageable);
	}

	@Operation(summary = "Ids of my saved properties (SAVED_PROPERTY_LIST)", description = """
			Property ids, newest saved first (at most 500), for showing which cards are saved.""")
	@GetMapping("/ids")
	public List<Long> ids(CurrentActor actor) {
		return savedPropertyService.ids(actor);
	}

	@Operation(summary = "Save a property (SAVED_PROPERTY_CREATE)", description = """
			Idempotent. 404 unless the property is published.""")
	@PutMapping("/{propertyId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void save(CurrentActor actor, @PathVariable @Positive Long propertyId) {
		rateLimiter.acquire("saved-property:write:user:" + actor.userId(), limits.savedPropertyWriteUser());
		savedPropertyService.save(actor, propertyId);
	}

	@Operation(summary = "Unsave a property (SAVED_PROPERTY_DELETE)", description = "Idempotent.")
	@DeleteMapping("/{propertyId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void remove(CurrentActor actor, @PathVariable @Positive Long propertyId) {
		rateLimiter.acquire("saved-property:write:user:" + actor.userId(), limits.savedPropertyWriteUser());
		savedPropertyService.remove(actor, propertyId);
	}

}
