package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import jakarta.validation.constraints.Size;

/**
 * The only filter of the public banner list; must be a configured placement. Eligibility (status,
 * schedule, deletion) is always applied by the server and cannot be changed by parameters.
 */
public record PublicBannerFilter(@Size(max = Banner.PLACEMENT_MAX_LENGTH) String placement) {
}
