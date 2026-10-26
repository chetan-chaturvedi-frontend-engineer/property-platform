package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Multipart fields sent with the optional category {@code image} file. Only these fields are bound,
 * so id, timestamps and deletion can never be set by the client.
 *
 * @param slug   omitted = generated from the title (made unique with a numeric suffix); given = used
 *               as is and rejected with 409 when taken
 * @param status defaults to active
 */
public record CreateBlogCategoryForm(
		@NotBlank @Size(max = BlogCategory.TITLE_MAX_LENGTH) String title,
		@Size(max = BlogCategory.SLUG_MAX_LENGTH)
		@Pattern(regexp = Blog.SLUG_PATTERN, message = BlogValidation.SLUG_MESSAGE) String slug,
		@Size(max = BlogCategory.ICON_MAX_LENGTH)
		@Pattern(regexp = BlogCategory.ICON_PATTERN, message = BlogValidation.ICON_MESSAGE) String icon,
		@Pattern(regexp = BlogCategoryStatus.VALUES, message = "must be active or inactive") String status,
		@Size(max = BlogCategory.META_TITLE_MAX_LENGTH) String metaTitle,
		@Size(max = BlogCategory.META_DESCRIPTION_MAX_LENGTH) String metaDescription) {
}
