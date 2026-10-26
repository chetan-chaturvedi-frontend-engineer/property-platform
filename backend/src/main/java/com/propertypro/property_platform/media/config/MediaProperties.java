package com.propertypro.property_platform.media.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.nio.file.Path;
import java.util.List;

/**
 * Upload limits and storage location ({@code app.media.*}). The multipart limits in
 * {@code spring.servlet.multipart} must be at least {@link #maxVideoSize}.
 *
 * @param storageRoot       private directory for uploaded files, outside the application and never
 *                          served directly; downloads go through authorized endpoints
 * @param allowedVideoHosts hosts (and their subdomains) allowed for external video links
 * @param allowedTourHosts  hosts (and their subdomains) allowed for 3D tour links
 */
@ConfigurationProperties("app.media")
public record MediaProperties(
		Path storageRoot,
		DataSize maxImageSize,
		DataSize maxPdfSize,
		DataSize maxVideoSize,
		List<String> allowedVideoHosts,
		List<String> allowedTourHosts,
		Limits limits) {

	/** Maximum media items per project or apartment configuration, by type. */
	public record Limits(int projectPhotos, int projectVideos, int projectBrochures, int apartmentFloorPlans,
			int apartmentPlanPdfs, int apartmentPhotos) {
	}

}
