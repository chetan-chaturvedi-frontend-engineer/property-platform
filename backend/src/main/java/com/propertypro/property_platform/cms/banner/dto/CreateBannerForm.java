package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

import static com.propertypro.property_platform.cms.banner.domain.Banner.LINK_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.PLACEMENT_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.TITLE_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.TYPE_MAX_LENGTH;

/**
 * Multipart fields sent with the banner {@code image} file. Only these fields are bound, so id,
 * timestamps and deletion can never be set by the client. {@code type} and {@code placement} must be
 * configured values ({@code app.banner}); {@code linkType} and {@code link} are given together or not
 * at all. Dates are ISO-8601 instants (e.g. {@code 2026-11-01T00:00:00Z}); both bounds are inclusive.
 *
 * @param status defaults to inactive; any other value also needs {@code BANNER_CHANGE_STATUS}
 */
public record CreateBannerForm(
		@NotBlank @Size(max = TITLE_MAX_LENGTH) String title,
		@NotBlank @Size(max = TYPE_MAX_LENGTH) String type,
		@NotBlank @Size(max = PLACEMENT_MAX_LENGTH) String placement,
		@Pattern(regexp = BannerLinkType.VALUES, message = "must be internal or external") String linkType,
		@Size(max = LINK_MAX_LENGTH) String link,
		@Pattern(regexp = BannerStatus.VALUES, message = "must be active or inactive") String status,
		Instant startDate,
		Instant endDate) {
}
