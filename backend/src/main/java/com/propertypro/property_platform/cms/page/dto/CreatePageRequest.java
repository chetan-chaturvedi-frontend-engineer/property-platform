package com.propertypro.property_platform.cms.page.dto;

import com.propertypro.property_platform.cms.page.domain.Page;
import com.propertypro.property_platform.cms.page.domain.PageStatus;
import com.propertypro.property_platform.cms.page.domain.PageType;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * New page. Only these fields are accepted; any other (id, createdAt, ...) is rejected. Text fields are
 * trimmed and blank optional ones are stored as null.
 *
 * @param heading  plain text
 * @param slug     omitted = generated from the heading (made unique with a numeric suffix); given =
 *                 used as is, 409 when another page has it
 * @param content  HTML; sanitized with an allow-list before it is stored
 * @param type     defaults to static
 * @param status   defaults to draft; publish also needs {@code PAGE_PUBLISH}
 */
@RejectUnknownFields
public record CreatePageRequest(
		@NotBlank @Size(max = Page.HEADING_MAX_LENGTH) String heading,
		@Size(max = Page.SUB_HEADING_MAX_LENGTH) String subHeading,
		@Size(max = Page.SLUG_MAX_LENGTH)
		@Pattern(regexp = Page.SLUG_PATTERN, message = PageValidation.SLUG_MESSAGE) String slug,
		@NotBlank @Size(max = Page.CONTENT_MAX_LENGTH) String content,
		@Pattern(regexp = PageType.VALUES, message = PageValidation.TYPE_MESSAGE) String type,
		@Pattern(regexp = PageStatus.VALUES, message = PageValidation.STATUS_MESSAGE) String status,
		@Size(max = Page.META_TITLE_MAX_LENGTH) String metaTitle,
		@Size(max = Page.META_DESCRIPTION_MAX_LENGTH) String metaDescription,
		@Size(max = Page.META_KEYWORDS_MAX_LENGTH) String metaKeywords) {
}
