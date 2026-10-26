package com.propertypro.property_platform.media.service;

import com.propertypro.property_platform.common.exception.ApiException;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.media.config.MediaProperties;
import com.propertypro.property_platform.media.storage.MediaStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Stores verified uploads and keeps storage consistent with the database: a file stored in a
 * transaction that rolls back is deleted, and a file whose row is deleted is removed only after
 * that deletion commits.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MediaUploadService {

	private static final int MAX_FILENAME_LENGTH = 255;
	private static final int MAX_URL_LENGTH = 2048;

	private final MediaStorage storage;
	private final MediaProperties properties;

	/**
	 * Checks the file's real type (signature), extension and size, then stores it under
	 * {@code keyPrefix/<random>.<ext>}.
	 *
	 * @param field request field reported in validation errors
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public StoredMedia store(MultipartFile file, Set<MediaFileType> allowed, String keyPrefix, String field) {
		if (file == null || file.isEmpty()) {
			throw new FieldValidationException(field, "must not be empty");
		}
		MediaFileType type = detect(file)
			.filter(allowed::contains)
			.orElseThrow(() -> new FieldValidationException(field, "must be one of: " + allowed.stream()
				.map(MediaFileType::getMimeType).sorted().collect(Collectors.joining(", "))));
		String extension = extension(file.getOriginalFilename());
		if (extension != null && !type.getExtensions().contains(extension)) {
			throw new FieldValidationException(field, "file extension does not match its content");
		}
		DataSize maxSize = maxSize(type);
		if (file.getSize() > maxSize.toBytes()) {
			throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "file_too_large",
					"The file is too large. The maximum for this type is " + maxSize.toMegabytes() + " MB.");
		}
		String key = keyPrefix + "/" + UUID.randomUUID() + "." + type.defaultExtension();
		try (InputStream content = file.getInputStream()) {
			storage.put(key, content);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Could not store upload", ex);
		}
		deleteOnRollback(key);
		return new StoredMedia(key, type, file.getSize(), displayName(file.getOriginalFilename()));
	}

	/** Deletes the stored file once the current transaction commits; nothing happens on rollback. */
	@Transactional(propagation = Propagation.MANDATORY)
	public void deleteAfterCommit(String storageKey) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				deleteQuietly(storageKey);
			}
		});
	}

	/**
	 * Returns the URL if it is an https URL on one of {@code allowedHosts} (or a subdomain), without
	 * credentials; throws a validation error for {@code field} otherwise.
	 */
	public String requireAllowedUrl(String url, List<String> allowedHosts, String field) {
		String message = "must be an https URL on an allowed host";
		if (url == null || url.length() > MAX_URL_LENGTH) {
			throw new FieldValidationException(field, message);
		}
		try {
			URI uri = new URI(url.strip());
			String host = uri.getHost() == null ? null : uri.getHost().toLowerCase(Locale.ROOT);
			boolean allowed = "https".equals(uri.getScheme()) && uri.getRawUserInfo() == null && host != null
					&& (uri.getPort() == -1 || uri.getPort() == 443)
					&& allowedHosts.stream().anyMatch(h -> host.equals(h) || host.endsWith("." + h));
			if (!allowed) {
				throw new FieldValidationException(field, message);
			}
			return uri.toString();
		}
		catch (URISyntaxException ex) {
			throw new FieldValidationException(field, message);
		}
	}

	private void deleteOnRollback(String storageKey) {
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCompletion(int status) {
				if (status != STATUS_COMMITTED) {
					deleteQuietly(storageKey);
				}
			}
		});
	}

	private void deleteQuietly(String storageKey) {
		try {
			storage.delete(storageKey);
		}
		catch (IOException | RuntimeException ex) {
			// The row is gone either way; an orphaned file only costs space.
			log.warn("Could not delete stored media file", ex);
		}
	}

	private DataSize maxSize(MediaFileType type) {
		return switch (type.getCategory()) {
			case IMAGE -> properties.maxImageSize();
			case PDF -> properties.maxPdfSize();
			case VIDEO -> properties.maxVideoSize();
		};
	}

	private static Optional<MediaFileType> detect(MultipartFile file) {
		byte[] header = new byte[MediaFileType.SIGNATURE_LENGTH];
		try (InputStream in = file.getInputStream()) {
			int length = in.readNBytes(header, 0, header.length);
			return MediaFileType.detect(header, length);
		}
		catch (IOException ex) {
			throw new UncheckedIOException("Could not read upload", ex);
		}
	}

	private static String extension(String filename) {
		String name = displayName(filename);
		int dot = name == null ? -1 : name.lastIndexOf('.');
		return dot < 0 || dot == name.length() - 1 ? null : name.substring(dot + 1).toLowerCase(Locale.ROOT);
	}

	/** File name without any directory part or control characters, or null. */
	private static String displayName(String filename) {
		if (filename == null) {
			return null;
		}
		String name = filename.substring(Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\')) + 1)
			.replaceAll("\\p{Cntrl}", "")
			.strip();
		if (name.isEmpty()) {
			return null;
		}
		return name.length() <= MAX_FILENAME_LENGTH ? name : name.substring(name.length() - MAX_FILENAME_LENGTH);
	}

}
