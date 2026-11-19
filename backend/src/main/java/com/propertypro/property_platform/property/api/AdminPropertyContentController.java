package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.dto.ExternalMediaRequest;
import com.propertypro.property_platform.property.dto.MediaOrderRequest;
import com.propertypro.property_platform.property.dto.MediaUploadForm;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.dto.SyncAmenitiesRequest;
import com.propertypro.property_platform.property.dto.SyncApartmentsRequest;
import com.propertypro.property_platform.property.dto.SyncNearbyPlacesRequest;
import com.propertypro.property_platform.property.dto.UpdateMediaRequest;
import com.propertypro.property_platform.property.service.PropertyAmenityService;
import com.propertypro.property_platform.property.service.PropertyApartmentService;
import com.propertypro.property_platform.property.service.PropertyMediaService;
import com.propertypro.property_platform.property.service.PropertyNearbyPlaceService;
import com.propertypro.property_platform.property.service.PropertyService;
import com.propertypro.property_platform.security.CurrentActor;
import com.propertypro.property_platform.security.ratelimit.RateLimitProperties;
import com.propertypro.property_platform.security.ratelimit.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.IF_MATCH;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.expectedVersion;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.withEtag;

/**
 * Admin dashboard: wizard steps 3, 5 and 6 (configurations, amenities, nearby places, media) over the
 * same services as the app endpoints. Writes return the whole property as the admin view, so the
 * dashboard gets the new {@code version} and admin media URLs in one response.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/properties", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin property content", description = "Configurations, amenities, nearby places and media")
@PreAuthorize("hasAuthority('PROPERTY_VIEW_ANY')")
@RequiredArgsConstructor
public class AdminPropertyContentController {

	private final PropertyService propertyService;
	private final PropertyApartmentService apartmentService;
	private final PropertyAmenityService amenityService;
	private final PropertyNearbyPlaceService nearbyPlaceService;
	private final PropertyMediaService mediaService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@Operation(summary = "Active amenities catalog")
	@GetMapping("/amenities")
	public List<AmenityResponse> amenityCatalog() {
		return amenityService.catalog();
	}

	@Operation(summary = "Step 3: save all configurations at once", description = """
			Items with an id update that configuration, items without one are created, and configurations \
			not listed are deleted. List order is the display order. Atomic.""")
	@PutMapping(path = "/{id}/apartments", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> syncApartments(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SyncApartmentsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		apartmentService.sync(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 5: replace the linked amenities", description = "Active catalog ids, no duplicates.")
	@PutMapping(path = "/{id}/amenities", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> syncAmenities(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SyncAmenitiesRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		amenityService.syncProjectAmenities(id, actor, request.amenityIds(), expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Replace the nearby places", description = "Up to 30; distances are stored as unverified.")
	@PutMapping(path = "/{id}/nearby-places", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> syncNearbyPlaces(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody SyncNearbyPlacesRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		nearbyPlaceService.sync(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Step 6: upload a photo, video or brochure", description = """
			multipart/form-data with file plus mediaType (photo, video, brochure), optional title, description, \
			primary. Same type and size rules as POST /api/v1/properties/{id}/media.""")
	@PostMapping(path = "/{id}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<PropertyResponse> uploadMedia(CurrentActor actor, @PathVariable Long id,
			@RequestPart("file") MultipartFile file, @Valid @ModelAttribute MediaUploadForm form,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:upload:user:" + actor.userId(), limits.propertyUploadUser());
		mediaService.uploadProjectMedia(id, actor, file, form, expectedVersion(ifMatch));
		return adminView(actor, id, HttpStatus.CREATED);
	}

	@Operation(summary = "Step 6: link an external video", description = "https URL on an allowed host (YouTube, Vimeo).")
	@PostMapping(path = "/{id}/media", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> addExternalMedia(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody ExternalMediaRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:upload:user:" + actor.userId(), limits.propertyUploadUser());
		mediaService.addExternalProjectMedia(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id, HttpStatus.CREATED);
	}

	@Operation(summary = "Reorder media", description = "mediaIds: every media id of the property once, in the new order.")
	@PutMapping(path = "/{id}/media/order", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> reorderMedia(CurrentActor actor, @PathVariable Long id,
			@Valid @RequestBody MediaOrderRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		mediaService.reorderProjectMedia(id, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Edit a media item's title or description, or make a photo the cover")
	@PatchMapping(path = "/{id}/media/{mediaId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<PropertyResponse> updateMedia(CurrentActor actor, @PathVariable Long id,
			@PathVariable Long mediaId, @Valid @RequestBody UpdateMediaRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		mediaService.updateProjectMedia(id, mediaId, actor, request, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@DeleteMapping("/{id}/media/{mediaId}")
	public ResponseEntity<PropertyResponse> deleteMedia(CurrentActor actor, @PathVariable Long id,
			@PathVariable Long mediaId, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		mediaService.deleteProjectMedia(id, mediaId, actor, expectedVersion(ifMatch));
		return adminView(actor, id);
	}

	@Operation(summary = "Download an uploaded file", description = "The url of the property's media items.")
	@GetMapping(path = "/{id}/media/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> mediaContent(CurrentActor actor, @PathVariable Long id, @PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(mediaService.projectMediaContent(id, mediaId, actor), false);
	}

	@Operation(summary = "Download an uploaded apartment file", description = "The url of a configuration's media items.")
	@GetMapping(path = "/{id}/apartments/{apartmentId}/media/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> apartmentMediaContent(CurrentActor actor, @PathVariable Long id,
			@PathVariable Long apartmentId, @PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(mediaService.apartmentMediaContent(id, apartmentId, mediaId, actor), false);
	}

	private ResponseEntity<PropertyResponse> adminView(CurrentActor actor, Long id) {
		return adminView(actor, id, HttpStatus.OK);
	}

	private ResponseEntity<PropertyResponse> adminView(CurrentActor actor, Long id, HttpStatus status) {
		return withEtag(status, propertyService.getAsAdmin(id, actor));
	}

}
