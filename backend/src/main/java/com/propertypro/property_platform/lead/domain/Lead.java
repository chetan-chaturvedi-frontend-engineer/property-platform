package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.property.domain.AreaUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
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
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * A customer enquiry tracked through the sales pipeline. Users are referenced by id only
 * ({@code users.id}); {@link LeadSchedule}s and {@link LeadInteraction}s hold this lead's id and are
 * loaded, paginated, through their own repositories.
 * <p>
 * Formats are also enforced by the checks in {@code V202610261400__create_leads}; request DTOs must
 * apply the same rules first. Phones are E.164, normalized by the caller (see {@code PhoneNumberNormalizer}).
 */
@Entity
@Table(name = "leads")
// Deletes set deleted_at; schedules and interactions are kept.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Lead {

	public static final int LEAD_NAME_MAX_LENGTH = 150;
	public static final int PREFERRED_LOCATION_MAX_LENGTH = 500;
	public static final int LOCATION_MAX_LENGTH = 255;
	public static final int FLOOR_PREFERENCE_MAX_LENGTH = 50;
	public static final int ADDITIONAL_NOTE_MAX_LENGTH = 5000;
	public static final int LOST_REASON_MAX_LENGTH = 500;
	public static final int AMENITIES_MAX_SIZE = 50;
	/** Same rule as {@code chk_leads_bhk}. */
	public static final String BHK_PATTERN = "^(studio|1rk|[1-9][0-9]?(\\.5)?)$";
	private static final String E164 = "^\\+[1-9][0-9]{6,14}$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	/** NULL for enquiries without a logged-in creator (website form, imports). */
	@Column(name = "created_by", updatable = false)
	@Setter(AccessLevel.NONE)
	private Long createdBy;

	/** Employee currently responsible; NULL = unassigned. */
	@Column(name = "assigned_to")
	private Long assignedTo;

	@NotNull
	@Column(nullable = false, length = 20)
	private LeadSource source = LeadSource.OTHER;

	@NotNull
	@Column(nullable = false, length = 30)
	private LeadStatus status = LeadStatus.NEW;

	@NotNull
	@Column(nullable = false, length = 10)
	private LeadPriority priority = LeadPriority.MEDIUM;

	@NotNull
	@Column(nullable = false, length = 10)
	private LeadPurpose purpose;

	@NotBlank
	@Size(max = LEAD_NAME_MAX_LENGTH)
	@Column(name = "lead_name", nullable = false, length = LEAD_NAME_MAX_LENGTH)
	private String leadName;

	@NotNull
	@Pattern(regexp = E164)
	@Column(nullable = false, length = 16)
	private String phone;

	@Pattern(regexp = E164)
	@Column(name = "alternate_phone", length = 16)
	private String alternatePhone;

	@Email
	@Size(max = 255)
	@Column
	private String email;

	@Column(name = "property_type", length = 20)
	private LeadPropertyType propertyType;

	@Pattern(regexp = BHK_PATTERN)
	@Column(length = 10)
	private String bhk;

	@PositiveOrZero
	@Column(name = "budget_min", precision = 14, scale = 2)
	private BigDecimal budgetMin;

	@PositiveOrZero
	@Column(name = "budget_max", precision = 14, scale = 2)
	private BigDecimal budgetMax;

	/** ISO 4217 code. */
	@NotNull
	@Pattern(regexp = "^[A-Z]{3}$")
	@Column(name = "budget_currency", nullable = false, length = 3)
	private String budgetCurrency = "INR";

	@Positive
	@Column(precision = 12, scale = 2)
	private BigDecimal area;

	@Column(name = "area_unit", length = 10)
	private AreaUnit areaUnit;

	/** Localities the customer wants the property in. */
	@Size(max = PREFERRED_LOCATION_MAX_LENGTH)
	@Column(name = "preferred_location", length = PREFERRED_LOCATION_MAX_LENGTH)
	private String preferredLocation;

	/** Where the customer currently is; not the desired property location. */
	@Size(max = LOCATION_MAX_LENGTH)
	@Column(length = LOCATION_MAX_LENGTH)
	private String location;

	@Column(length = 20)
	private PossessionTimeline possession;

	@Column(name = "move_in_date")
	private LocalDate moveInDate;

	@Size(max = FLOOR_PREFERENCE_MAX_LENGTH)
	@Column(name = "floor_preference", length = FLOOR_PREFERENCE_MAX_LENGTH)
	private String floorPreference;

	@Column(length = 10)
	private Facing facing;

	@Column(length = 20)
	private Furnishing furnishing;

	@Column(length = 20)
	private ParkingPreference parking;

	/** {@code property_amenities} slugs; the caller checks they exist. */
	@Size(max = AMENITIES_MAX_SIZE)
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "amenities")
	private List<@NotBlank @Size(max = 120) String> amenities;

	@Column(name = "loan_required", nullable = false)
	private boolean loanRequired;

	@Size(max = ADDITIONAL_NOTE_MAX_LENGTH)
	@Column(name = "additional_note")
	private String additionalNote;

	@Column(name = "last_contacted_at")
	private Instant lastContactedAt;

	@Column(name = "next_follow_up_at")
	private Instant nextFollowUpAt;

	@Size(max = LOST_REASON_MAX_LENGTH)
	@Column(name = "lost_reason", length = LOST_REASON_MAX_LENGTH)
	private String lostReason;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	/**
	 * @param createdBy the authenticated user, or {@code null} for anonymous enquiries; never a
	 *                  client-supplied id
	 */
	public Lead(Long createdBy, LeadPurpose purpose, String leadName, String phone) {
		this.createdBy = createdBy;
		this.purpose = purpose;
		this.leadName = leadName;
		this.phone = phone;
	}

	@AssertTrue(message = "budget minimum must not exceed the maximum")
	boolean isBudgetRangeValid() {
		return budgetMin == null || budgetMax == null || budgetMax.compareTo(budgetMin) >= 0;
	}

	@AssertTrue(message = "area unit is required when area is set")
	boolean isAreaUnitPresent() {
		return area == null || areaUnit != null;
	}

}
