package com.propertypro.property_platform.cms.banner.exception;

import com.propertypro.property_platform.common.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class BannerExceptions {

	private BannerExceptions() {
	}

	/** Also for soft-deleted banners, and for public requests on banners that are not live. */
	public static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "banner_not_found", "Banner not found.");
	}

	public static ApiException imageNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "banner_image_not_found", "Banner image not found.");
	}

	public static ApiException statusChangeForbidden() {
		return new ApiException(HttpStatus.FORBIDDEN, "banner_status_change_forbidden",
				"You are not allowed to change the status of banners.");
	}

}
