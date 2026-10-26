package com.propertypro.property_platform.property.dto;

import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** A project video hosted elsewhere: an https URL on an allowed video host (e.g. YouTube, Vimeo). */
@RejectUnknownFields
public record ExternalMediaRequest(
		@NotBlank @Pattern(regexp = "video", message = "must be video") String mediaType,
		@NotBlank @Size(max = 2048) String url,
		@Size(max = 150) String title,
		@Size(max = 2000) String description) {
}
