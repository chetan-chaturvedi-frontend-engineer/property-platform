package com.propertypro.property_platform.cms.page.domain;

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
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Content page (about us, privacy policy, ...), public while published.
 * <p>
 * Formats are also enforced by the checks in {@code V202610261200__create_pages}; request DTOs must
 * apply the same rules first. {@code id}, {@code slug} and timestamps have no setters. {@code content}
 * is untrusted HTML and must be sanitized with an allow-list before it is stored or rendered.
 */
@Entity
@Table(name = "pages")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Page {

	public static final int HEADING_MAX_LENGTH = 255;
	public static final int SUB_HEADING_MAX_LENGTH = 255;
	public static final int SLUG_MAX_LENGTH = 255;
	/** Same as blog content. */
	public static final int CONTENT_MAX_LENGTH = 100_000;
	public static final int META_TITLE_MAX_LENGTH = 255;
	public static final int META_DESCRIPTION_MAX_LENGTH = 1000;
	public static final int META_KEYWORDS_MAX_LENGTH = 1000;
	/** Same rule as {@code chk_pages_slug_format} and {@code Slugs}. */
	public static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotBlank
	@Size(max = HEADING_MAX_LENGTH)
	@Column(nullable = false, length = HEADING_MAX_LENGTH)
	private String heading;

	@Size(max = SUB_HEADING_MAX_LENGTH)
	@Column(name = "sub_heading", length = SUB_HEADING_MAX_LENGTH)
	private String subHeading;

	/** Unique among all pages; change it through {@link #changeSlug}. */
	@NotNull
	@Pattern(regexp = SLUG_PATTERN)
	@Size(max = SLUG_MAX_LENGTH)
	@Column(nullable = false, unique = true, length = SLUG_MAX_LENGTH)
	@Setter(AccessLevel.NONE)
	private String slug;

	@NotNull
	@Size(max = CONTENT_MAX_LENGTH)
	@Column(nullable = false)
	private String content = "";

	@NotNull
	@Column(nullable = false, length = 20)
	private PageType type = PageType.STATIC;

	@NotNull
	@Column(nullable = false, length = 20)
	private PageStatus status = PageStatus.DRAFT;

	@Size(max = META_TITLE_MAX_LENGTH)
	@Column(name = "meta_title", length = META_TITLE_MAX_LENGTH)
	private String metaTitle;

	@Size(max = META_DESCRIPTION_MAX_LENGTH)
	@Column(name = "meta_description")
	private String metaDescription;

	/** Comma-separated keywords. */
	@Size(max = META_KEYWORDS_MAX_LENGTH)
	@Column(name = "meta_keywords")
	private String metaKeywords;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public Page(String heading, String slug) {
		this.heading = heading;
		this.slug = slug;
	}

	/** Changes the public URL; the caller must check uniqueness and validate the slug first. */
	public void changeSlug(String slug) {
		this.slug = slug;
	}

}
