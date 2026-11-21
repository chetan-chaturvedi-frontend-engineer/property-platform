package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.PropertyEngagementResponse;
import com.propertypro.property_platform.property.service.PropertyEngagementService;
import com.propertypro.property_platform.security.CurrentActor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Views and saves of the caller's own properties (seller dashboard). */
@RestController
@RequestMapping(path = "/api/v1/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Property engagement", description = "Views and saves of the caller's properties")
@Validated
@RequiredArgsConstructor
public class PropertyEngagementController {

	private final PropertyEngagementService engagementService;

	@Operation(summary = "Engagement of all my properties (PROPERTY_LIST)", description = """
			Views, unique viewers and saves summed over the caller's own, non-deleted properties.""")
	@GetMapping("/engagement")
	public PropertyEngagementResponse mine(CurrentActor actor) {
		return engagementService.forOwner(actor);
	}

	@Operation(summary = "Engagement of one property (PROPERTY_VIEW)", description = """
			404 for a property the caller does not own.""")
	@GetMapping("/{id}/engagement")
	public PropertyEngagementResponse one(CurrentActor actor, @PathVariable @Positive Long id) {
		return engagementService.forProperty(id, actor);
	}

}
