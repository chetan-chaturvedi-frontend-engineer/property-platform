package com.propertypro.property_platform.media.service;

import lombok.Getter;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * File types accepted for upload, recognized by their leading bytes (signature), never by the
 * client's content type. SVG, HTML and other active content are deliberately absent.
 */
@Getter
public enum MediaFileType {

	JPEG("image/jpeg", Category.IMAGE, List.of("jpg", "jpeg")),
	PNG("image/png", Category.IMAGE, List.of("png")),
	WEBP("image/webp", Category.IMAGE, List.of("webp")),
	PDF("application/pdf", Category.PDF, List.of("pdf")),
	MP4("video/mp4", Category.VIDEO, List.of("mp4"));

	/** Bytes needed by {@link #detect}. */
	public static final int SIGNATURE_LENGTH = 12;

	private final String mimeType;
	private final Category category;
	private final List<String> extensions;

	MediaFileType(String mimeType, Category category, List<String> extensions) {
		this.mimeType = mimeType;
		this.category = category;
		this.extensions = extensions;
	}

	public String defaultExtension() {
		return extensions.get(0);
	}

	public static Optional<MediaFileType> detect(byte[] header, int length) {
		if (startsWith(header, length, 0, 0xFF, 0xD8, 0xFF)) {
			return Optional.of(JPEG);
		}
		if (startsWith(header, length, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
			return Optional.of(PNG);
		}
		if (startsWith(header, length, 0, 'R', 'I', 'F', 'F') && startsWith(header, length, 8, 'W', 'E', 'B', 'P')) {
			return Optional.of(WEBP);
		}
		if (startsWith(header, length, 0, '%', 'P', 'D', 'F', '-')) {
			return Optional.of(PDF);
		}
		// ISO base media: a box size, then "ftyp".
		if (startsWith(header, length, 4, 'f', 't', 'y', 'p')) {
			return Optional.of(MP4);
		}
		return Optional.empty();
	}

	public static Optional<MediaFileType> byExtension(String extension) {
		return Arrays.stream(values()).filter(type -> type.extensions.contains(extension)).findFirst();
	}

	private static boolean startsWith(byte[] data, int length, int offset, int... expected) {
		if (length < offset + expected.length) {
			return false;
		}
		for (int i = 0; i < expected.length; i++) {
			if ((data[offset + i] & 0xFF) != expected[i]) {
				return false;
			}
		}
		return true;
	}

	public enum Category {
		IMAGE, PDF, VIDEO
	}

}
