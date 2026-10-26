package com.propertypro.property_platform.media.service;

/**
 * A verified upload in private storage.
 *
 * @param originalFilename display name only, stripped of any path; never used to build keys
 */
public record StoredMedia(String storageKey, MediaFileType type, long size, String originalFilename) {
}
