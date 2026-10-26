package com.propertypro.property_platform.property.api;

import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.property.dto.ExternalMediaRequest;
import com.propertypro.property_platform.property.dto.MediaOrderRequest;
import com.propertypro.property_platform.property.dto.MediaResponse;
import com.propertypro.property_platform.property.dto.MediaUploadForm;
import com.propertypro.property_platform.property.dto.UpdateMediaRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
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

/** Wizard step 6: photos (first one is the cover), videos and the brochure of a property. */
@RestController
@RequestMapping(path = "/api/v1/properties/{propertyId}/media", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Property media", description = "Wizard step 6: photos, videos and brochure")
@RequiredArgsConstructor
public class PropertyMediaController {

	private final PropertyMediaService mediaService;
	private final RateLimiter rateLimiter;
	private final RateLimitProperties limits;

	@GetMapping
	public List<MediaResponse> list(CurrentActor actor, @PathVariable Long propertyId) {
		return mediaService.listProjectMedia(propertyId, actor);
	}

	@Operation(summary = "Upload a photo, video or brochure", description = """
			multipart/form-data with file plus mediaType (photo, video, brochure), optional title, description, \
			primary (photos: make it the cover). Photos JPEG/PNG/WebP up to 10 MB, video MP4 up to 50 MB, \
			brochure PDF up to 20 MB; the type is checked by content, not by name or content type.""")
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public MediaResponse upload(CurrentActor actor, @PathVariable Long propertyId,
			@RequestPart("file") MultipartFile file, @Valid @ModelAttribute MediaUploadForm form,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:upload:user:" + actor.userId(), limits.propertyUploadUser());
		return mediaService.uploadProjectMedia(propertyId, actor, file, form, expectedVersion(ifMatch));
	}

	@Operation(summary = "Link an external video", description = "https URL on an allowed host (YouTube, Vimeo).")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	public MediaResponse addExternal(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody ExternalMediaRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		rateLimiter.acquire("property:upload:user:" + actor.userId(), limits.propertyUploadUser());
		return mediaService.addExternalProjectMedia(propertyId, actor, request, expectedVersion(ifMatch));
	}

	@Operation(summary = "Reorder", description = "mediaIds: every media id of the property once, in the new order.")
	@PutMapping(path = "/order", consumes = MediaType.APPLICATION_JSON_VALUE)
	public List<MediaResponse> reorder(CurrentActor actor, @PathVariable Long propertyId,
			@Valid @RequestBody MediaOrderRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return mediaService.reorderProjectMedia(propertyId, actor, request, expectedVersion(ifMatch));
	}

	@Operation(summary = "Edit title or description, or make a photo the cover")
	@PatchMapping(path = "/{mediaId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public MediaResponse update(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long mediaId,
			@Valid @RequestBody UpdateMediaRequest request,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		return mediaService.updateProjectMedia(propertyId, mediaId, actor, request, expectedVersion(ifMatch));
	}

	@DeleteMapping("/{mediaId}")
	public ResponseEntity<Void> delete(CurrentActor actor, @PathVariable Long propertyId, @PathVariable Long mediaId,
			@RequestHeader(name = IF_MATCH, required = false) String ifMatch) {
		mediaService.deleteProjectMedia(propertyId, mediaId, actor, expectedVersion(ifMatch));
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "Download an uploaded file", description = "Same access rules as the property.")
	@GetMapping(path = "/{mediaId}/content", produces = MediaType.ALL_VALUE)
	public ResponseEntity<Resource> content(CurrentActor actor, @PathVariable Long propertyId,
			@PathVariable Long mediaId) {
		return PropertyRequestHeaders.file(mediaService.projectMediaContent(propertyId, mediaId, actor), false);
	}

}
