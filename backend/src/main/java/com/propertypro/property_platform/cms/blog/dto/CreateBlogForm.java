package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Multipart fields sent with the optional {@code featureImage} file. Only these fields are bound, so
 * id, timestamps and deletion can never be set by the client.
 *
 * @param slug        omitted = generated from the title (made unique with a numeric suffix); given =
 *                    used as is and rejected with 409 when taken
 * @param categoryId  an existing, non-deleted category; required to publish
 * @param content     HTML; sanitized with an allow-list before it is stored
 * @param status      defaults to draft
 * @param tags        repeat the field ({@code tags=a&tags=b}); normalized (trimmed, lowercase, deduplicated)
 * @param publishedAt publish: when it becomes public (future = scheduled; default now). Draft: an
 *                    optional planned time with no effect on visibility
 */
public record CreateBlogForm(
		@NotBlank @Size(max = Blog.TITLE_MAX_LENGTH) String title,
		@Size(max = Blog.SLUG_MAX_LENGTH)
		@Pattern(regexp = Blog.SLUG_PATTERN, message = BlogValidation.SLUG_MESSAGE) String slug,
		@Positive Long categoryId,
		@Size(max = Blog.SHORT_DESCRIPTION_MAX_LENGTH) String shortDescription,
		@NotBlank @Size(max = Blog.CONTENT_MAX_LENGTH) String content,
		@Pattern(regexp = BlogStatus.VALUES, message = "must be draft or publish") String status,
		@Size(max = Blog.META_TITLE_MAX_LENGTH) String metaTitle,
		@Size(max = Blog.META_DESCRIPTION_MAX_LENGTH) String metaDescription,
		@Size(max = Blog.MAX_TAGS) List<@NotBlank @Size(max = Blog.TAG_MAX_LENGTH) String> tags,
		Instant publishedAt) {
}
