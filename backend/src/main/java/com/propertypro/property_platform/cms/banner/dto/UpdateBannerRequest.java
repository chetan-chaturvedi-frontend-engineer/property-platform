package com.propertypro.property_platform.cms.banner.dto;

import com.propertypro.property_platform.cms.banner.domain.BannerLinkType;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Optional;

import static com.propertypro.property_platform.cms.banner.domain.Banner.LINK_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.PLACEMENT_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.TITLE_MAX_LENGTH;
import static com.propertypro.property_platform.cms.banner.domain.Banner.TYPE_MAX_LENGTH;

/**
 * Partial update (PATCH), same rules as {@link CreateBannerForm}. Per field: omitted ({@code null}
 * here) keeps the saved value; an explicit JSON {@code null} clears linkType, link, startDate and
 * endDate and is rejected for the others. The link pair and the schedule are validated on the merged
 * values. Any other field (id, image, createdAt, deleteAt, ...) is rejected; the image has its own
 * endpoint.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateBannerRequest {

	private Optional<@NotBlank @Size(max = TITLE_MAX_LENGTH) String> title;

	private Optional<@NotBlank @Size(max = TYPE_MAX_LENGTH) String> type;

	private Optional<@NotBlank @Size(max = PLACEMENT_MAX_LENGTH) String> placement;

	private Optional<@Pattern(regexp = BannerLinkType.VALUES, message = "must be internal or external") String> linkType;

	private Optional<@Size(max = LINK_MAX_LENGTH) String> link;

	/** Changing it also needs {@code BANNER_CHANGE_STATUS}. */
	private Optional<@NotNull
			@Pattern(regexp = BannerStatus.VALUES, message = "must be active or inactive") String> status;

	private Optional<Instant> startDate;

	private Optional<Instant> endDate;

}
