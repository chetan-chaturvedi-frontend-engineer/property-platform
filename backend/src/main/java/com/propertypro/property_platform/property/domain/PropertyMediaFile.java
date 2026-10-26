package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;

/**
 * Shared columns of project and apartment media. A row points either to an uploaded object
 * ({@link #filePath}, a private storage key) or to an https external URL, never both.
 * The storage key is internal: responses expose a signed/CDN URL instead.
 */
@MappedSuperclass
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public abstract class PropertyMediaFile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// Random server-generated object key; client filenames are never used here.
	@Pattern(regexp = "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9/_.-]*$")
	@Size(max = 1024)
	@Column(name = "file_path")
	private String filePath;

	@URL(protocol = "https")
	@Size(max = 2048)
	@Column(name = "external_url")
	private String externalUrl;

	@Size(max = 255)
	@Column(name = "original_filename")
	private String originalFilename;

	@Size(max = 100)
	@Column(name = "mime_type", length = 100)
	private String mimeType;

	@Positive
	@Column(name = "file_size")
	private Long fileSize;

	@Setter
	@Size(max = 150)
	@Column(length = 150)
	private String title;

	@Setter
	@Size(max = 2000)
	private String description;

	@Setter
	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@Setter
	@Column(name = "is_primary", nullable = false)
	private boolean primary;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/**
	 * An uploaded object. {@code mimeType} and {@code fileSize} must come from the verified upload
	 * (content sniffing, size check), not from the client.
	 */
	protected void useStoredFile(String storageKey, String mimeType, long fileSize, String originalFilename) {
		this.filePath = storageKey;
		this.mimeType = mimeType;
		this.fileSize = fileSize;
		this.originalFilename = originalFilename;
		this.externalUrl = null;
	}

	/** An externally hosted file; the caller must check the host against its allow-list. */
	protected void useExternalUrl(String url) {
		this.externalUrl = url;
		this.filePath = null;
		this.mimeType = null;
		this.fileSize = null;
		this.originalFilename = null;
	}

	@AssertTrue(message = "media needs exactly one of an uploaded file or an external URL")
	boolean isSourceValid() {
		boolean stored = filePath != null;
		return stored != (externalUrl != null) && (!stored || (mimeType != null && fileSize != null));
	}

}
