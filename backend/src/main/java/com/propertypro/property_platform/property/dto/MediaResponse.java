package com.propertypro.property_platform.property.dto;

import java.time.Instant;

/**
 * A media item. {@code url} is an API path that streams an uploaded file after authorization, or the
 * external URL; storage keys are never exposed.
 */
public record MediaResponse(Long id, String mediaType, String url, boolean external, String mimeType, Long fileSize,
		String originalFilename, String title, String description, int sortOrder, boolean primary, Instant createdAt) {
}
