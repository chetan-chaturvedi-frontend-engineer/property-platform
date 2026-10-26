package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;

import java.time.Instant;

/**
 * A live banner for the app and website: only what is needed to render it. No status, timestamps,
 * deletion data or storage keys. {@code imageUrl} changes whenever the image is replaced, so it can
 * be cached for long.
 */
public record PublicBannerResponse(Long id, String title, String type, String placement, BannerLinkType linkType,
		String link, String imageUrl, Instant startDate, Instant endDate) {

	public static final String IMAGE_PATH = "/api/v1/public/banners/%d/image/%s";

	public static PublicBannerResponse from(Banner banner) {
		return new PublicBannerResponse(banner.getId(), banner.getTitle(), banner.getType(), banner.getPlacement(),
				banner.getLinkType(), banner.getLink(), IMAGE_PATH.formatted(banner.getId(), banner.imageFileName()),
				banner.getStartDate(), banner.getEndDate());
	}

}
