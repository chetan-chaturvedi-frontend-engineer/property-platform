package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.dto.NearbyPlaceResponse;
import com.propertypro.property_platform.property.dto.SyncAmenitiesRequest;
import com.propertypro.property_platform.property.dto.SyncNearbyPlacesRequest;
import com.propertypro.property_platform.property.service.PropertyAmenityService;
import com.propertypro.property_platform.property.service.PropertyNearbyPlaceService;
import com.propertypro.property_platform.security.CurrentActor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.IF_MATCH;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.expectedVersion;

/** Wizard step 5 (amenities) and nearby places. The amenity catalog itself is read-only here. */
@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Property amenities and nearby places", description = "Wizard step 5 and nearby places")
@RequiredArgsConstructor
public class PropertyAmenityController {

	private final PropertyAmenityService amenityService;
	private final PropertyNearbyPlaceService nearbyPlaceService;

	@Operation(summary = "Active amenities catalog")
	@GetMapping("/amenities")
	public List<AmenityResponse> catalog() {
		return amenityService.catalog();
	}

	@GetMapping("/properties/{propertyId}/amenities")
	public List<AmenityResponse> list(CurrentActor actor, @PathVariable Long propertyId) {
		return amenityService.projectAmenities(propertyId, actor);
	}

	@Operation(summary = "Replace the linked amenities", description = "Active catalog ids, no duplicates.")
	@PutMapping(path = "/properties/{propertyId}/amenities", consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<AmenityResponse> sync(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody SyncAmenitiesRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return amenityService.syncProjectAmenities(propertyId, actor, request.amenityIds(), expectedVersion(ifMatch));
	}

	@GetMapping("/properties/{propertyId}/nearby-places")
	public List<NearbyPlaceResponse> nearbyPlaces(CurrentActor actor, @PathVariable Long propertyId) {
		return nearbyPlaceService.list(propertyId, actor);
	}

	@Operation(summary = "Replace the nearby places", description = "Up to 30; distances are stored as unverified.")
	@PutMapping(path = "/properties/{propertyId}/nearby-places", consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<NearbyPlaceResponse> syncNearbyPlaces(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody SyncNearbyPlacesRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return nearbyPlaceService.sync(propertyId, actor, request, expectedVersion(ifMatch));
	}

}
