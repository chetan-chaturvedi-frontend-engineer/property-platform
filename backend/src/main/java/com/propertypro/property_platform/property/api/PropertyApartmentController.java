package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.dto.ApartmentRequest;
import com.propertypro.property_platform.property.dto.ApartmentResponse;
import com.propertypro.property_platform.property.dto.MediaOrderRequest;
import com.propertypro.property_platform.property.dto.MediaResponse;
import com.propertypro.property_platform.property.dto.MediaUploadForm;
import com.propertypro.property_platform.property.dto.SyncAmenitiesRequest;
import com.propertypro.property_platform.property.dto.SyncApartmentsRequest;
import com.propertypro.property_platform.property.service.PropertyAmenityService;
import com.propertypro.property_platform.property.service.PropertyApartmentService;
import com.propertypro.property_platform.property.service.PropertyMediaService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.IF_MATCH;
import static com.propertypro.property_platform.property.api.PropertyRequestHeaders.expectedVersion;

/** Wizard step 3: apartment configurations of a property, with their amenities and media. */
@RestController
@RequestMapping(path = "/api/v1/properties/{propertyId}/apartments", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Property apartments", description = "Wizard step 3: unit types / apartment configurations")
@RequiredArgsConstructor
public class PropertyApartmentController {

	private final PropertyApartmentService apartmentService;
	private final PropertyAmenityService amenityService;
	private final PropertyMediaService mediaService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@GetMapping
	public List<ApartmentResponse> list(CurrentActor actor, @PathVariable Long propertyId) {
		return apartmentService.list(propertyId, actor);
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public ApartmentResponse create(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody ApartmentRequest request, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return apartmentService.create(propertyId, actor, request, expectedVersion(ifMatch));
	}

	@Operation(summary = "Save all configurations at once", description = """
			Items with an id update that configuration, items without one are created, and configurations \
			not listed are deleted. List order is the display order. Atomic: all or nothing.""")
	@PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<ApartmentResponse> sync(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody SyncApartmentsRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return apartmentService.sync(propertyId, actor, request, expectedVersion(ifMatch));
	}

	@GetMapping("/{apartmentId}")
	public ApartmentResponse get(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long apartmentId) {
		return apartmentService.get(propertyId, apartmentId, actor);
	}

	@PutMapping(path = "/{apartmentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ApartmentResponse update(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long apartmentId,
			@Valid @RequestBody ApartmentRequest request, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return apartmentService.update(propertyId, apartmentId, actor, request, expectedVersion(ifMatch));
	}

	@DeleteMapping("/{apartmentId}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId, @RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		apartmentService.delete(propertyId, apartmentId, actor, expectedVersion(ifMatch));
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{apartmentId}/amenities")
	public List<AmenityResponse> amenities(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId) {
		return amenityService.apartmentAmenities(propertyId, apartmentId, actor);
	}

	@PutMapping(path = "/{apartmentId}/amenities", consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<AmenityResponse> syncAmenities(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId, @Valid @RequestBody SyncAmenitiesRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return amenityService.syncApartmentAmenities(propertyId, apartmentId, actor, request.amenityIds(),
				expectedVersion(ifMatch));
	}

	@GetMapping("/{apartmentId}/media")
	public List<MediaResponse> media(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long apartmentId) {
		return mediaService.listApartmentMedia(propertyId, apartmentId, actor);
	}

	@Operation(summary = "Upload a floor plan image, plan PDF or photo", description = """
			multipart/form-data with file plus mediaType (floor_plan_image, plan_pdf, photo), optional title, \
			description, primary. Images: JPEG/PNG/WebP up to 10 MB; PDF up to 20 MB. Type is checked by content.""")
	@PostMapping(path = "/{apartmentId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public MediaResponse upload(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long apartmentId,
			@RequestPart("file") MultipartFile file, @Valid @ModelAttribute MediaUploadForm form,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:upload:user:" + actor.userId(), limits.propertyUploadUser());
		return mediaService.uploadApartmentMedia(propertyId, apartmentId, actor, file, form, expectedVersion(ifMatch));
	}

	@PutMapping(path = "/{apartmentId}/media/order", consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<MediaResponse> reorderMedia(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId, @Valid @RequestBody MediaOrderRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return mediaService.reorderApartmentMedia(propertyId, apartmentId, actor, request, expectedVersion(ifMatch));
	}

	@DeleteMapping("/{apartmentId}/media/{mediaId}")
	public ResponseEntity<Void> deleteMedia(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId, @PathVariable Long mediaId,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		mediaService.deleteApartmentMedia(propertyId, apartmentId, mediaId, actor, expectedVersion(ifMatch));
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Download an uploaded apartment file", description = "Same access rules as the property.")
	@GetMapping(path = "/{apartmentId}/media/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> content(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long apartmentId, @PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(mediaService.apartmentMediaContent(propertyId, apartmentId, mediaId, actor),
				false);
	}

}
