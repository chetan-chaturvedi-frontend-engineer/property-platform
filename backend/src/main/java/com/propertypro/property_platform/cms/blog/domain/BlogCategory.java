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
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Blog category. Blogs reference it by id ({@link Blog#getCategoryId()}) and are listed through
 * {@code BlogRepository}, always paginated.
 * <p>
 * Formats are also enforced by the checks in {@code V202610251800__create_blog_categories}; request
 * DTOs must apply the same rules first. {@code id}, {@code slug} and timestamps have no setters.
 */
@Entity
@Table(name = "blog_categories")
// Deletes set deleted_at; the category's blogs are kept.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BlogCategory {

	public static final int TITLE_MAX_LENGTH = 255;
	public static final int SLUG_MAX_LENGTH = 255;
	public static final int ICON_MAX_LENGTH = 100;
	/** Same as banner and property media storage keys. */
	public static final int IMAGE_MAX_LENGTH = 1024;
	public static final int META_TITLE_MAX_LENGTH = 255;
	public static final int META_DESCRIPTION_MAX_LENGTH = 1000;
	/** Same rule as {@code chk_blog_categories_icon}. */
	public static final String ICON_PATTERN = "^[A-Za-z0-9][A-Za-z0-9_:-]*$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotBlank
	@Size(max = TITLE_MAX_LENGTH)
	@Column(nullable = false, length = TITLE_MAX_LENGTH)
	private String title;

	/** Generated with {@code Slugs.slugify}; unique among all categories, including deleted ones. */
	@NotNull
	@Pattern(regexp = Blog.SLUG_PATTERN)
	@Size(max = SLUG_MAX_LENGTH)
	@Column(nullable = false, unique = true, length = SLUG_MAX_LENGTH)
	@Setter(AccessLevel.NONE)
	private String slug;

	/** UI icon identifier, not a URL. */
	@Pattern(regexp = ICON_PATTERN)
	@Size(max = ICON_MAX_LENGTH)
	@Column(length = ICON_MAX_LENGTH)
	private String icon;

	/** Object storage key, never a URL; serve it through a signed/CDN URL. */
	@Size(max = IMAGE_MAX_LENGTH)
	private String image;

	@NotNull
	@Column(nullable = false, length = 20)
	private BlogCategoryStatus status = BlogCategoryStatus.ACTIVE;

	@Size(max = META_TITLE_MAX_LENGTH)
	@Column(name = "meta_title", length = META_TITLE_MAX_LENGTH)
	private String metaTitle;

	@Size(max = META_DESCRIPTION_MAX_LENGTH)
	@Column(name = "meta_description")
	private String metaDescription;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public BlogCategory(String title, String slug) {
		this.title = title;
		this.slug = slug;
	}

	/** Changes the public URL; the caller must check uniqueness and validate the slug first. */
	public void changeSlug(String slug) {
		this.slug = slug;
	}

	public boolean isActive() {
		return status == BlogCategoryStatus.ACTIVE;
	}

	/** Last segment of the storage key (random, e.g. {@code <uuid>.webp}), or null without an image. */
	public String imageFileName() {
		return image == null ? null : image.substring(image.lastIndexOf('/') + 1);
	}

}
