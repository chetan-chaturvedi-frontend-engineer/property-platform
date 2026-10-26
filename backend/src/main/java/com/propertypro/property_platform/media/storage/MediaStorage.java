package com.propertypro.property_platform.media.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Private file store addressed by server-generated keys (relative, e.g. {@code projects/12/<uuid>.jpg}).
 * Keys never contain client input. Swap the implementation for object storage (S3-compatible) in
 * production without changing callers.
 */
public interface MediaStorage {

	void put(String key, InputStream content) throws IOException;

	/** The stored file; {@link Resource#exists()} is false when it is missing. */
	Resource get(String key);

	/** Deletes the file if it exists. */
	void delete(String key) throws IOException;

}
