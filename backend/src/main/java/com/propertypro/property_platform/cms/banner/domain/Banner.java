package com.propertypro.property_platform.cms.banner.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Promotional banner. Eligible for display while {@link #isDisplayableAt(Instant)}; the same rule is
 * the {@code BannerRepository.findDisplayable} query, which list endpoints must use.
 * <p>
 * Link, link type, image key and schedule are validated by the database checks in
 * {@code V202610251700__create_banners}; request DTOs must apply the same rules first.
 */
@Entity
@Table(name = "banners")
// The column is named delete_at (not the project's usual deleted_at), so it is set explicitly.
// Deletes set it instead of removing the row; queries skip soft-deleted banners.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "delete_at")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Banner {

	public static final int TITLE_MAX_LENGTH = 255;
	public static final int TYPE_MAX_LENGTH = 50;
	public static final int PLACEMENT_MAX_LENGTH = 100;
	public static final int LINK_MAX_LENGTH = 2048;
	/** Same as property media storage keys. */
	public static final int IMAGE_MAX_LENGTH = 1024;
	/** Same rule as {@code chk_banners_type_format} and {@code chk_banners_placement_format}. */
	public static final String KEY_PATTERN = "^[a-z][a-z0-9_]*$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@Column(nullable = false, length = TITLE_MAX_LENGTH)
	private String title;

	@Column(nullable = false, length = TYPE_MAX_LENGTH)
	private String type;

	@Column(nullable = false, length = PLACEMENT_MAX_LENGTH)
	private String placement;

	@Column(name = "link_type", length = 20)
	@Setter(AccessLevel.NONE)
	private BannerLinkType linkType;

	@Column(length = LINK_MAX_LENGTH)
	@Setter(AccessLevel.NONE)
	private String link;

	/** Object storage key, never a URL; serve it through a signed/CDN URL. */
	@Size(max = IMAGE_MAX_LENGTH)
	@Column(nullable = false)
	private String image;

	@Column(nullable = false, length = 20)
	private BannerStatus status = BannerStatus.INACTIVE;

	@Column(name = "start_date")
	@Setter(AccessLevel.NONE)
	private Instant startDate;

	@Column(name = "end_date")
	@Setter(AccessLevel.NONE)
	private Instant endDate;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public Banner(String title, String type, String placement, String image) {
		this.title = title;
		this.type = type;
		this.placement = placement;
		this.image = image;
	}

	/** Both null removes the link; the database rejects a link without a type and vice versa. */
	public void changeLink(BannerLinkType linkType, String link) {
		this.linkType = linkType;
		this.link = link;
	}

	/** Either bound may be null (open); both bounds are inclusive. */
	public void reschedule(Instant startDate, Instant endDate) {
		this.startDate = startDate;
		this.endDate = endDate;
	}

	public boolean isDisplayableAt(Instant now) {
		return displayStateAt(now) == BannerDisplayState.LIVE;
	}

	public BannerDisplayState displayStateAt(Instant now) {
		if (status != BannerStatus.ACTIVE) {
			return BannerDisplayState.INACTIVE;
		}
		if (startDate != null && now.isBefore(startDate)) {
			return BannerDisplayState.SCHEDULED;
		}
		if (endDate != null && now.isAfter(endDate)) {
			return BannerDisplayState.EXPIRED;
		}
		return BannerDisplayState.LIVE;
	}

	/** Last segment of the storage key (random, e.g. {@code <uuid>.webp}); part of the image URL. */
	public String imageFileName() {
		return image.substring(image.lastIndexOf('/') + 1);
	}

}
