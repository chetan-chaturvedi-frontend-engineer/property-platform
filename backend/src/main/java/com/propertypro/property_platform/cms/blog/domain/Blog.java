package com.propertypro.property_platform.cms.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;

/**
 * Blog post. Public while {@link BlogPublicState#of} is LIVE; public queries use the same rule through
 * {@code PublicBlogs} (served by the partial {@code idx_blogs_public_*} indexes).
 * <p>
 * Formats are also enforced by the checks in {@code V202610251810__create_blogs}; request DTOs must
 * apply the same rules first. {@code id}, {@code slug}, status, {@code publishedAt} and timestamps
 * have no setters: they change only through the methods below, which callers must authorize.
 * {@code content} is untrusted HTML and must be sanitized with an allow-list before it is stored or
 * rendered.
 */
@Entity
@Table(name = "blogs")
// Deletes set deleted_at instead of removing the row; queries skip soft-deleted blogs.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Blog {

	public static final int TITLE_MAX_LENGTH = 255;
	public static final int SLUG_MAX_LENGTH = 255;
	/** Same as banner and property media storage keys. */
	public static final int FEATURE_IMAGE_MAX_LENGTH = 1024;
	public static final int SHORT_DESCRIPTION_MAX_LENGTH = 1000;
	public static final int CONTENT_MAX_LENGTH = 100_000;
	public static final int META_TITLE_MAX_LENGTH = 255;
	public static final int META_DESCRIPTION_MAX_LENGTH = 1000;
	public static final int MAX_TAGS = 20;
	public static final int TAG_MAX_LENGTH = 50;
	/** Same rule as {@code chk_blogs_slug_format}, {@code chk_blog_categories_slug_format} and {@code Slugs}. */
	public static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotBlank
	@Size(max = TITLE_MAX_LENGTH)
	@Column(nullable = false, length = TITLE_MAX_LENGTH)
	private String title;

	/** Generated with {@code Slugs.slugify}; unique among all blogs, including deleted ones. */
	@NotNull
	@Pattern(regexp = SLUG_PATTERN)
	@Size(max = SLUG_MAX_LENGTH)
	@Column(nullable = false, unique = true, length = SLUG_MAX_LENGTH)
	@Setter(AccessLevel.NONE)
	private String slug;

	/** Object storage key, never a URL; serve it through a signed/CDN URL. */
	@Size(max = FEATURE_IMAGE_MAX_LENGTH)
	@Column(name = "feature_image")
	private String featureImage;

	/**
	 * {@code blog_categories.id}; must be an existing category, checked by the service. Mapped as an
	 * id because Hibernate cannot lazily map a link to a {@code @SoftDelete} entity.
	 */
	@Column(name = "category_id")
	private Long categoryId;

	@Size(max = SHORT_DESCRIPTION_MAX_LENGTH)
	@Column(name = "short_description")
	private String shortDescription;

	@Size(max = CONTENT_MAX_LENGTH)
	private String content;

	@NotNull
	@Column(nullable = false, length = 20)
	@Setter(AccessLevel.NONE)
	private BlogStatus status = BlogStatus.DRAFT;

	@Size(max = META_TITLE_MAX_LENGTH)
	@Column(name = "meta_title", length = META_TITLE_MAX_LENGTH)
	private String metaTitle;

	@Size(max = META_DESCRIPTION_MAX_LENGTH)
	@Column(name = "meta_description")
	private String metaDescription;

	@Size(max = MAX_TAGS)
	@JdbcTypeCode(SqlTypes.JSON)
	private List<@NotBlank @Size(max = TAG_MAX_LENGTH) String> tags;

	/** Actual or scheduled publication time; kept when a published blog returns to draft. */
	@Column(name = "published_at")
	@Setter(AccessLevel.NONE)
	private Instant publishedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public Blog(String title, String slug) {
		this.title = title;
		this.slug = slug;
	}

	/** Changes the public URL; the caller must check uniqueness and validate the slug first. */
	public void changeSlug(String slug) {
		this.slug = slug;
	}

	/**
	 * @param publishAt now to publish immediately, or a future time to schedule the post; never null
	 */
	public void publish(Instant publishAt) {
		if (publishAt == null) {
			throw new IllegalArgumentException("A published blog needs a publication time");
		}
		this.status = BlogStatus.PUBLISH;
		this.publishedAt = publishAt;
	}

	/** Back to draft; the publication time is kept until changed with {@link #planPublication}. */
	public void unpublish() {
		this.status = BlogStatus.DRAFT;
	}

	/** Planned (or past) publication time of a draft; null clears it. Published blogs use {@link #publish}. */
	public void planPublication(Instant publishAt) {
		if (status != BlogStatus.DRAFT) {
			throw new IllegalStateException("Only drafts have a planned publication time");
		}
		this.publishedAt = publishAt;
	}

	/** Status and time only; public visibility also needs an active category (see {@link BlogPublicState}). */
	public boolean isPublishedAt(Instant now) {
		return status == BlogStatus.PUBLISH && publishedAt != null && !publishedAt.isAfter(now);
	}

	/** Last segment of the storage key (random, e.g. {@code <uuid>.webp}), or null without an image. */
	public String featureImageFileName() {
		return featureImage == null ? null : featureImage.substring(featureImage.lastIndexOf('/') + 1);
	}

}
