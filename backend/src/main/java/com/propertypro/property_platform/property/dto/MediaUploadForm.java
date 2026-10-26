package com.propertypro.property_platform.property.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Multipart fields sent with an uploaded {@code file}. The file's real type is detected from its
 * content and must fit {@code mediaType}; the client's content type and file name are not trusted.
 *
 * @param mediaType project: photo, video or brochure; apartment: floor_plan_image, plan_pdf or photo
 * @param primary   make this the cover image (photos and floor plan images only)
 */
public record MediaUploadForm(@NotNull @Size(max = 30) String mediaType, @Size(max = 150) String title,
		@Size(max = 2000) String description, Boolean primary) {
}
