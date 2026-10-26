package com.propertypro.property_platform.cms.blog.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.media.service.MediaFileType;
import com.propertypro.property_platform.media.storage.MediaStorage;
import org.springframework.core.io.Resource;

import java.util.EnumSet;
import java.util.Set;
import java.util.function.Supplier;

/** A stored blog or category image to stream. */
public record BlogImage(Resource resource, String mimeType) {

	static final Set<MediaFileType> TYPES = EnumSet.of(MediaFileType.JPEG, MediaFileType.PNG, MediaFileType.WEBP);

	/**
	 * The image under {@code storageKey}, only when {@code requestedFileName} is its current file name
	 * (the random last key segment), so old or guessed URLs fail with {@code notFound}.
	 */
	static BlogImage load(MediaStorage storage, String storageKey, String requestedFileName,
			Supplier<ApiException> notFound) {
		if (storageKey == null) {
			throw notFound.get();
		}
		String stored = storageKey.substring(storageKey.lastIndexOf('/') + 1);
		if (!stored.equals(requestedFileName)) {
			throw notFound.get();
		}
		MediaFileType type = MediaFileType.byExtension(stored.substring(stored.lastIndexOf('.') + 1))
			.filter(TYPES::contains)
			.orElseThrow(notFound);
		Resource resource = storage.get(storageKey);
		if (!resource.exists()) {
			throw notFound.get();
		}
		return new BlogImage(resource, type.getMimeType());
	}

}
