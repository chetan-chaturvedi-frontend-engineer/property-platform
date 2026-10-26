package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Floor plan image, plan PDF or photo of an apartment configuration. At most one primary image. */
@Entity
@Table(name = "property_apartment_media")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyApartmentMedia extends PropertyMediaFile {

	@NotNull
	@Column(name = "property_apartment_id", nullable = false, updatable = false)
	private Long propertyApartmentId;

	@NotNull
	@Column(name = "media_type", nullable = false, length = 20)
	private ApartmentMediaType mediaType;

	private PropertyApartmentMedia(Long propertyApartmentId, ApartmentMediaType mediaType) {
		this.propertyApartmentId = propertyApartmentId;
		this.mediaType = mediaType;
	}

	public static PropertyApartmentMedia storedFile(Long propertyApartmentId, ApartmentMediaType mediaType, String storageKey,
			String mimeType, long fileSize, String originalFilename) {
		PropertyApartmentMedia media = new PropertyApartmentMedia(propertyApartmentId, mediaType);
		media.useStoredFile(storageKey, mimeType, fileSize, originalFilename);
		return media;
	}

	public static PropertyApartmentMedia externalUrl(Long propertyApartmentId, ApartmentMediaType mediaType,
			String url) {
		PropertyApartmentMedia media = new PropertyApartmentMedia(propertyApartmentId, mediaType);
		media.useExternalUrl(url);
		return media;
	}

	@AssertTrue(message = "a plan PDF cannot be the primary media")
	boolean isPrimaryAllowed() {
		return !isPrimary() || mediaType != ApartmentMediaType.PLAN_PDF;
	}

}
