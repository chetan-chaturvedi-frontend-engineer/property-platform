package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Photo, video or brochure of a project. At most one primary (cover) photo per project. */
@Entity
@Table(name = "property_project_media")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyProjectMedia extends PropertyMediaFile {

	@NotNull
	@Column(name = "property_project_id", nullable = false, updatable = false)
	private Long propertyProjectId;

	@NotNull
	@Column(name = "media_type", nullable = false, length = 20)
	private ProjectMediaType mediaType;

	private PropertyProjectMedia(Long propertyProjectId, ProjectMediaType mediaType) {
		this.propertyProjectId = propertyProjectId;
		this.mediaType = mediaType;
	}

	public static PropertyProjectMedia storedFile(Long propertyProjectId, ProjectMediaType mediaType, String storageKey,
			String mimeType, long fileSize, String originalFilename) {
		PropertyProjectMedia media = new PropertyProjectMedia(propertyProjectId, mediaType);
		media.useStoredFile(storageKey, mimeType, fileSize, originalFilename);
		return media;
	}

	public static PropertyProjectMedia externalUrl(Long propertyProjectId, ProjectMediaType mediaType, String url) {
		PropertyProjectMedia media = new PropertyProjectMedia(propertyProjectId, mediaType);
		media.useExternalUrl(url);
		return media;
	}

	@AssertTrue(message = "only a photo can be the primary media")
	boolean isPrimaryAllowed() {
		return !isPrimary() || mediaType == ProjectMediaType.PHOTO;
	}

}
