package com.propertypro.property_platform.media.storage;

import com.propertypro.property_platform.media.config.MediaProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;

/**
 * {@link MediaStorage} on the local file system under {@code app.media.storage-root}. Suitable for
 * a single instance; use shared object storage before running several.
 */
@Component
public class LocalMediaStorage implements MediaStorage {

	/** Same rule as the media tables' {@code file_path} check constraints. */
	private static final Pattern KEY = Pattern.compile("^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9/_.-]*$");

	private final Path root;

	public LocalMediaStorage(MediaProperties properties) {
		this.root = properties.storageRoot().toAbsolutePath().normalize();
	}

	@Override
	public void put(String key, InputStream content) throws IOException {
		Path target = resolve(key);
		Files.createDirectories(target.getParent());
		// Write to a temporary file first, so a failed upload never leaves a partial file under the key.
		Path temp = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
		try {
			Files.copy(content, temp, StandardCopyOption.REPLACE_EXISTING);
			Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
		}
		finally {
			Files.deleteIfExists(temp);
		}
	}

	@Override
	public Resource get(String key) {
		return new FileSystemResource(resolve(key));
	}

	@Override
	public void delete(String key) throws IOException {
		Files.deleteIfExists(resolve(key));
	}

	private Path resolve(String key) {
		if (key == null || !KEY.matcher(key).matches()) {
			throw new IllegalArgumentException("Invalid storage key");
		}
		Path path = root.resolve(key).normalize();
		if (!path.startsWith(root)) {
			throw new IllegalArgumentException("Invalid storage key");
		}
		return path;
	}

}
