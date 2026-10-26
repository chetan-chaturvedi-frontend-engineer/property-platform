package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Partial update (PATCH), same rules as {@link CreatePageRequest}. Omitted ({@code null} here) keeps the
 * saved value. An explicit JSON {@code null} clears an optional field (subHeading and the meta fields)
 * and is rejected for the required ones. Changing the heading never changes the slug; send
 * {@code slug} to change the public URL. Changing {@code status} also needs {@code PAGE_PUBLISH}.
 * Any other field (id, createdAt, ...) is rejected.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdatePageRequest {

	private Optional<@NotBlank @Size(max = Page.HEADING_MAX_LENGTH) String> heading;

	private Optional<@Size(max = Page.SUB_HEADING_MAX_LENGTH) String> subHeading;

	private Optional<@NotNull @Size(max = Page.SLUG_MAX_LENGTH)
			@Pattern(regexp = Page.SLUG_PATTERN, message = PageValidation.SLUG_MESSAGE) String> slug;

	private Optional<@NotBlank @Size(max = Page.CONTENT_MAX_LENGTH) String> content;

	private Optional<@NotNull @Pattern(regexp = PageType.VALUES, message = PageValidation.TYPE_MESSAGE) String> type;

	private Optional<@NotNull @Pattern(regexp = PageStatus.VALUES, message = PageValidation.STATUS_MESSAGE) String> status;

	private Optional<@Size(max = Page.META_TITLE_MAX_LENGTH) String> metaTitle;

	private Optional<@Size(max = Page.META_DESCRIPTION_MAX_LENGTH) String> metaDescription;

	private Optional<@Size(max = Page.META_KEYWORDS_MAX_LENGTH) String> metaKeywords;

}
