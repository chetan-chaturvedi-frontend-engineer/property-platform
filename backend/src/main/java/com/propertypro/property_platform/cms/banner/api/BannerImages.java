package com.propertypro.property_platform.cms.banner.api;

import com.propertypro.property_platform.cms.banner.service.BannerService.BannerImage;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Duration;

final class BannerImages {

	private BannerImages() {
	}

	/**
	 * Streams a banner image inline. Public URLs contain the random file name, which changes when the
	 * image is replaced, so they can be cached; admin responses are never stored.
	 */
	static ResponseEntity<Resource> response(BannerImage image, boolean cacheable) {
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(image.mimeType()))
			.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().build().toString())
			.header("X-Content-Type-Options", "nosniff")
			.cacheControl(cacheable ? CacheControl.maxAge(Duration.ofHours(1)).cachePublic() : CacheControl.noStore())
			.body(image.resource());
	}

}
