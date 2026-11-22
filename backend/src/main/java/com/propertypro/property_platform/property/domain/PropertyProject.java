package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SoftDelete;
import org.hibernate.annotations.SoftDeleteType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * A builder/owner project with its apartment configurations, media and nearby places. Amenities are
 * linked through {@link PropertyProjectAmenity}.
 * The owner is referenced by id only ({@code users.id}); the user module is reached through its services.
 * <p>
 * Bean Validation constraints are checked again by Hibernate before insert/update, as a backstop
 * behind request DTO validation. {@code userId}, {@code slug}, publication and legal status have no
 * setters: they change only through the methods below, which callers must authorize.
 */
@Entity
@Table(name = "property_projects")
// Deletes set deleted_at; children are kept and hidden with the project.
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyProject {

	private static final String E164 = "^\\+[1-9][0-9]{6,14}$";
	private static final String GSTIN = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$";
	private static final String PINCODE = "^[1-9][0-9]{5}$";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@NotNull
	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@NotNull
	@Column(nullable = false, updatable = false, length = 180)
	private String slug;

	@Setter
	@NotNull
	@Column(name = "property_type", nullable = false, length = 20)
	private PropertyType propertyType;

	@Setter
	@NotBlank
	@Size(max = 150)
	@Column(name = "project_name", nullable = false, length = 150)
	private String projectName;

	@Setter
	@NotBlank
	@Size(max = 150)
	@Column(name = "builder_company_name", nullable = false, length = 150)
	private String builderCompanyName;

	/** The builder's user account (admin dashboard); null when only the name is known. */
	@Setter
	@Column(name = "builder_user_id")
	private Long builderUserId;

	@Setter
	@Size(max = 50)
	@Column(name = "rera_number", length = 50)
	private String reraNumber;

	@Setter
	@Pattern(regexp = GSTIN)
	@Column(name = "gst_number", length = 15)
	private String gstNumber;

	@Setter
	@NotBlank
	@Email
	@Size(max = 255)
	@Column(name = "project_email", nullable = false)
	private String projectEmail;

	/** E.164, normalized by the caller (see {@code PhoneNumberNormalizer}). */
	@Setter
	@NotNull
	@Pattern(regexp = E164)
	@Column(name = "project_phone", nullable = false, length = 16)
	private String projectPhone;

	// Location may be missing on drafts; submission requires it (see PropertyWizardService).
	@Setter
	@Size(max = 1000)
	@Column(name = "project_address")
	private String projectAddress;

	@Setter
	@Size(max = 100)
	@Column(length = 100)
	private String city;

	@Setter
	@Size(max = 100)
	@Column(length = 100)
	private String locality;

	@Setter
	@Pattern(regexp = PINCODE)
	@Column(length = 10)
	private String pincode;

	@Setter
	@Size(max = 100)
	@Column(length = 100)
	private String state;

	@Setter
	@Size(max = 150)
	@Column(length = 150)
	private String landmark;

	@DecimalMin("-90")
	@DecimalMax("90")
	@Column(precision = 9, scale = 6)
	private BigDecimal latitude;

	@DecimalMin("-180")
	@DecimalMax("180")
	@Column(precision = 9, scale = 6)
	private BigDecimal longitude;

	@Setter
	@PositiveOrZero
	@Column(name = "total_towers_blocks")
	private Integer totalTowersBlocks;

	@Setter
	@PositiveOrZero
	@Column(name = "total_units_flats")
	private Integer totalUnitsFlats;

	@Setter
	@NotNull
	@Column(name = "project_status", nullable = false, length = 30)
	private ProjectStatus projectStatus = ProjectStatus.UPCOMING;

	@NotNull
	@Column(name = "legal_approval_status", nullable = false, length = 20)
	private LegalApprovalStatus legalApprovalStatus = LegalApprovalStatus.PENDING;

	@Setter
	@Positive
	@Column(name = "land_area", precision = 14, scale = 4)
	private BigDecimal landArea;

	@Setter
	@Column(name = "land_area_unit", length = 10)
	private AreaUnit landAreaUnit;

	@Setter
	@Column(name = "possession_start_date")
	private LocalDate possessionStartDate;

	@Setter
	@Column(name = "possession_end_date")
	private LocalDate possessionEndDate;

	@Setter
	@Size(max = 10_000)
	@Column(name = "project_description")
	private String projectDescription;

	@Setter
	@Size(max = 20)
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "project_highlights")
	private List<@NotBlank @Size(max = 200) String> projectHighlights;

	@Setter
	@URL(protocol = "https")
	@Size(max = 2048)
	@Column(name = "three_d_tour_url")
	private String threeDTourUrl;

	@NotNull
	@Column(name = "publication_status", nullable = false, length = 20)
	private PublicationStatus publicationStatus = PublicationStatus.DRAFT;

	/** Set when the project is first published; kept while unpublished or suspended. */
	@Column(name = "published_at")
	private Instant publishedAt;

	/** First incomplete wizard step, recomputed by the server after every change (7 = ready). */
	@Column(name = "wizard_step", nullable = false)
	private short wizardStep = 1;

	/** Idempotency-Key of the creating request; a retry with the same key returns this project. */
	@Column(name = "idempotency_key", updatable = false, length = 100)
	private String idempotencyKey;

	// Incremented on every change to the project or its children (see #touch), so clients can
	// detect concurrent edits with If-Match.
	@Version
	@Column(nullable = false)
	private long version;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	// Read-only views: children own their property_project_id and are saved through their own
	// repositories. Hibernate cannot lazily map a child-to-parent link to a @SoftDelete entity, and
	// without cascades a soft delete of the project can never hard-delete its children.
	@OneToMany
	@JoinColumn(name = "property_project_id", insertable = false, updatable = false)
	@OrderBy("displayOrder ASC, id ASC")
	@Getter(AccessLevel.NONE)
	private List<PropertyApartment> apartments = new ArrayList<>();

	@OneToMany
	@JoinColumn(name = "property_project_id", insertable = false, updatable = false)
	@OrderBy("sortOrder ASC, id ASC")
	@Getter(AccessLevel.NONE)
	private List<PropertyProjectMedia> media = new ArrayList<>();

	@OneToMany
	@JoinColumn(name = "property_project_id", insertable = false, updatable = false)
	@OrderBy("distanceKm ASC, id ASC")
	@Getter(AccessLevel.NONE)
	private List<PropertyProjectNearbyPlace> nearbyPlaces = new ArrayList<>();

	/**
	 * @param userId the authenticated user, never a client-supplied id
	 * @param slug   from {@code ProjectSlugGenerator}, called in the transaction that inserts the project
	 *               (as is {@code PropertyLimitGuard}, which every creation path must call first)
	 */
	public PropertyProject(Long userId, String slug) {
		this(userId, slug, null);
	}

	public PropertyProject(Long userId, String slug, String idempotencyKey) {
		this.userId = userId;
		this.slug = slug;
		this.idempotencyKey = idempotencyKey;
	}

	public boolean isOwnedBy(Long userId) {
		return this.userId.equals(userId);
	}

	/** Sets or clears the map location; both coordinates are required together. */
	public void setLocation(BigDecimal latitude, BigDecimal longitude) {
		this.latitude = latitude;
		this.longitude = longitude;
	}

	/** Apartment configurations that are not soft-deleted. */
	public List<PropertyApartment> getApartments() {
		return Collections.unmodifiableList(apartments);
	}

	public List<PropertyProjectMedia> getMedia() {
		return Collections.unmodifiableList(media);
	}

	public List<PropertyProjectNearbyPlace> getNearbyPlaces() {
		return Collections.unmodifiableList(nearbyPlaces);
	}

	/**
	 * Applies a workflow transition. The caller must check the actor's permission for the action
	 * and, for {@code SUBMIT}, that the project is complete.
	 *
	 * @throws IllegalStateException if the action is not allowed from the current status
	 */
	public void apply(PublicationAction action, Instant now) {
		if (!action.isAllowedFrom(publicationStatus)) {
			throw new IllegalStateException(
					"Cannot " + action.getValue() + " a project in status " + publicationStatus.getValue());
		}
		publicationStatus = action.getTo();
		if (publicationStatus == PublicationStatus.PUBLISHED && publishedAt == null) {
			publishedAt = now;
		}
	}

	/** An owner changed an approved or published project: it goes offline until reviewed again. */
	public void revertToDraft() {
		publicationStatus = PublicationStatus.DRAFT;
	}

	/** Administrator action; the caller must check the administrator's permission. */
	public void reviewLegalApproval(LegalApprovalStatus status) {
		legalApprovalStatus = status;
	}

	public void setWizardStep(int step) {
		this.wizardStep = (short) step;
	}

	/**
	 * Marks the project changed so its version increments even when only children changed. Hibernate
	 * sets {@code updatedAt} again on flush; assigning it here only makes the entity dirty.
	 */
	public void touch(Instant now) {
		this.updatedAt = now;
	}

	@AssertTrue(message = "latitude and longitude must be provided together")
	boolean isLocationComplete() {
		return (latitude == null) == (longitude == null);
	}

	@AssertTrue(message = "land area unit is required when land area is set")
	boolean isLandAreaUnitPresent() {
		return landArea == null || landAreaUnit != null;
	}

	@AssertTrue(message = "possession end date must not be before the start date")
	boolean isPossessionRangeValid() {
		return possessionStartDate == null || possessionEndDate == null
				|| !possessionEndDate.isBefore(possessionStartDate);
	}

}
