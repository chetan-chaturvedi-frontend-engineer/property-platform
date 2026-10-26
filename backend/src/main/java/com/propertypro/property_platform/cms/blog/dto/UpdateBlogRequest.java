package com.propertypro.property_platform.cms.blog.dto;

import com.propertypro.property_platform.cms.blog.domain.Blog;
import com.propertypro.property_platform.cms.blog.domain.BlogStatus;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Partial update (PATCH), same rules as {@link CreateBlogForm}. Per field: omitted ({@code null}
 * here) keeps the saved value; an explicit JSON {@code null} clears categoryId (drafts only),
 * shortDescription, metaTitle, metaDescription, tags and publishedAt (drafts only) and is rejected for
 * the others. Changing the title never changes the slug; send {@code slug} to change the public URL.
 * Status, publishedAt and category are validated on the merged result. Any other field (id,
 * featureImage, createdAt, deletedAt, ...) is rejected; the feature image has its own endpoints.
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateBlogRequest {

	private Optional<@NotBlank @Size(max = Blog.TITLE_MAX_LENGTH) String> title;

	private Optional<@NotNull @Size(max = Blog.SLUG_MAX_LENGTH)
			@Pattern(regexp = Blog.SLUG_PATTERN, message = BlogValidation.SLUG_MESSAGE) String> slug;

	private Optional<@Positive Long> categoryId;

	private Optional<@Size(max = Blog.SHORT_DESCRIPTION_MAX_LENGTH) String> shortDescription;

	private Optional<@NotBlank @Size(max = Blog.CONTENT_MAX_LENGTH) String> content;

	private Optional<@NotNull @Pattern(regexp = BlogStatus.VALUES, message = "must be draft or publish") String> status;

	private Optional<@Size(max = Blog.META_TITLE_MAX_LENGTH) String> metaTitle;

	private Optional<@Size(max = Blog.META_DESCRIPTION_MAX_LENGTH) String> metaDescription;

	private Optional<@Size(max = Blog.MAX_TAGS) List<@NotBlank @Size(max = Blog.TAG_MAX_LENGTH) String>> tags;

	private Optional<Instant> publishedAt;

}
