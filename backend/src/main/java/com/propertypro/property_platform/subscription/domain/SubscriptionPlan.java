package com.propertypro.property_platform.subscription.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Subscription plan catalog entry, managed only through admin endpoints. Retired with status
 * {@code inactive}, never deleted. Field defaults mirror the column defaults.
 * <p>
 * The constants are shared with the request DTOs so both validate the same rules as the
 * migration's CHECK constraints.
 */
@Entity
@Table(name = "subscription_plans")
// Writes only changed columns, so a status change and a concurrent edit of other fields do not
// overwrite each other.
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubscriptionPlan {

	public static final int TITLE_MAX_LENGTH = 100;
	public static final int SLUG_MAX_LENGTH = 120;
	public static final int ICON_MAX_LENGTH = 100;
	public static final int PHOTO_MAX_LENGTH = 2048;
	public static final int DESCRIPTION_MAX_LENGTH = 5000;
	public static final int MAX_FEATURES = 50;
	public static final int FEATURE_MAX_LENGTH = 200;
	public static final int MAX_BILLING_INTERVAL_COUNT = 36;
	public static final int MAX_PROPERTIES = 1_000_000;
	public static final int MAX_SORT_ORDER = 100_000;
	public static final int MAX_TRIAL_DAYS = 365;
	/** Same rule as {@code chk_subscription_plans_slug_format}. */
	public static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
	/** UI icon identifier such as "crown" or "mdi:star-outline"; no paths, URLs or spaces. */
	public static final String ICON_PATTERN = "^[A-Za-z0-9][A-Za-z0-9_.:-]*$";
	/** Relative object storage key without ".." or an https URL, as in {@code chk_subscription_plans_photo}. */
	public static final String PHOTO_PATTERN = "^(https://\\S+|(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9/_.-]*)$";
	public static final String CURRENCY_PATTERN = "^[A-Z]{3}$";
	public static final String DEFAULT_CURRENCY = "INR";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@Size(max = ICON_MAX_LENGTH)
	@Column(length = ICON_MAX_LENGTH)
	private String icon;

	@Size(max = PHOTO_MAX_LENGTH)
	@Column
	private String photo;

	@NotBlank
	@Size(max = TITLE_MAX_LENGTH)
	@Column(nullable = false, length = TITLE_MAX_LENGTH)
	private String title;

	@NotNull
	@Pattern(regexp = SLUG_PATTERN)
	@Column(nullable = false, length = SLUG_MAX_LENGTH)
	private String slug;

	@NotNull
	@PositiveOrZero
	@Digits(integer = 12, fraction = 2)
	@Column(nullable = false, precision = 14, scale = 2)
	private BigDecimal price;

	@NotNull
	@Pattern(regexp = CURRENCY_PATTERN)
	@Column(nullable = false, length = 3)
	private String currency = DEFAULT_CURRENCY;

	@NotNull
	@Column(name = "billing_interval", nullable = false, length = 20)
	private BillingInterval billingInterval = BillingInterval.MONTH;

	@Positive
	@Column(name = "billing_interval_count", nullable = false)
	private int billingIntervalCount = 1;

	@Size(max = DESCRIPTION_MAX_LENGTH)
	@Column
	private String description;

	/** Maximum active property listings; {@code null} means unlimited. */
	@PositiveOrZero
	@Column(name = "no_of_properties")
	private Integer noOfProperties;

	/** Display-only feature list; not used for feature gating. */
	@NotNull
	@Size(max = MAX_FEATURES)
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false)
	private List<@NotBlank @Size(max = FEATURE_MAX_LENGTH) String> features = new ArrayList<>();

	@NotNull
	@Column(nullable = false, length = 20)
	private SubscriptionPlanStatus status = SubscriptionPlanStatus.DRAFT;

	@Column(name = "is_popular", nullable = false)
	private boolean popular;

	@PositiveOrZero
	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@PositiveOrZero
	@Column(name = "trial_days", nullable = false)
	private int trialDays;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public SubscriptionPlan(String title, String slug, BigDecimal price) {
		this.title = title;
		this.slug = slug;
		setPrice(price);
	}

	/** Stored with scale 2, so 999 becomes 999.00 before it is saved and returned; never rounds. */
	public void setPrice(BigDecimal price) {
		this.price = price == null ? null : price.setScale(2, RoundingMode.UNNECESSARY);
	}

	@AssertTrue(message = "lifetime plans must have a billing interval count of 1")
	boolean isLifetimeChargedOnce() {
		return billingInterval != BillingInterval.LIFETIME || billingIntervalCount == 1;
	}

}
