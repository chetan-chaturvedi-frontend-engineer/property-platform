package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Optional admin list filters from query parameters; all given filters must match. {@code search}
 * matches the title case-insensitively; date bounds are inclusive. Type and placement are checked for
 * format only, so banners of a retired type or placement can still be found.
 */
public record BannerFilter(
		@Size(max = 100) String search,
		@Pattern(regexp = BannerStatus.VALUES, message = "must be active or inactive") String status,
		@Size(max = Banner.TYPE_MAX_LENGTH)
		@Pattern(regexp = Banner.KEY_PATTERN, message = "must be lowercase letters, digits and underscores") String type,
		@Size(max = Banner.PLACEMENT_MAX_LENGTH)
		@Pattern(regexp = Banner.KEY_PATTERN, message = "must be lowercase letters, digits and underscores") String placement,
		@Pattern(regexp = BannerLinkType.VALUES, message = "must be internal or external") String linkType,
		Instant startDateFrom,
		Instant startDateTo,
		Instant endDateFrom,
		Instant endDateTo) {
}
