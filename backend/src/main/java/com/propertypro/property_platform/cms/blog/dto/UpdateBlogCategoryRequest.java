package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogCategory;
import com.propertypro.property_platform.cms.blog.domain.BlogCategoryStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Partial update (PATCH), same rules as {@link CreateBlogCategoryForm}. Per field: omitted
 * ({@code null} here) keeps the saved value; an explicit JSON {@code null} clears icon, metaTitle and
 * metaDescription and is rejected for the others. Changing the title never changes the slug; send
 * {@code slug} to change the public URL. Any other field (id, image, createdAt, deletedAt, ...) is
 * rejected; the image has its own endpoints.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateBlogCategoryRequest {

	private Optional<@NotBlank @Size(max = BlogCategory.TITLE_MAX_LENGTH) String> title;

	private Optional<@NotNull @Size(max = BlogCategory.SLUG_MAX_LENGTH)
			@Pattern(regexp = Blog.SLUG_PATTERN, message = BlogValidation.SLUG_MESSAGE) String> slug;

	private Optional<@Size(max = BlogCategory.ICON_MAX_LENGTH)
			@Pattern(regexp = BlogCategory.ICON_PATTERN, message = BlogValidation.ICON_MESSAGE) String> icon;

	private Optional<@NotNull
			@Pattern(regexp = BlogCategoryStatus.VALUES, message = "must be active or inactive") String> status;

	private Optional<@Size(max = BlogCategory.META_TITLE_MAX_LENGTH) String> metaTitle;

	private Optional<@Size(max = BlogCategory.META_DESCRIPTION_MAX_LENGTH) String> metaDescription;

}
