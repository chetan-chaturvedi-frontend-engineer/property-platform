package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerDisplayState;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;

import java.time.Instant;

/**
 * Admin view of a banner. {@code imageUrl} is an API path that streams the image after
 * authorization; storage keys are never exposed. {@code displayState} is computed at response time.
 */
public record BannerResponse(Long id, String title, String type, String placement, BannerLinkType linkType,
		String link, String imageUrl, BannerStatus status, BannerDisplayState displayState, Instant startDate,
		Instant endDate, Instant createdAt, Instant updatedAt) {

	public static final String IMAGE_PATH = "/api/v1/admin/banners/%d/image/%s";

	public static BannerResponse from(Banner banner, Instant now) {
		return new BannerResponse(banner.getId(), banner.getTitle(), banner.getType(), banner.getPlacement(),
				banner.getLinkType(), banner.getLink(), IMAGE_PATH.formatted(banner.getId(), banner.imageFileName()),
				banner.getStatus(), banner.displayStateAt(now), banner.getStartDate(), banner.getEndDate(),
				banner.getCreatedAt(), banner.getUpdatedAt());
	}

}
