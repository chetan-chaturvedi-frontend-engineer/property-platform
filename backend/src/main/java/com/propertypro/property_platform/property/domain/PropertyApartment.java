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
import jakarta.validation.constraints.AssertTrue;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * An apartment configuration (unit type) of a project, e.g. "2 BHK Type A". A project may have
 * several configurations of the same {@link ApartmentType}. Areas are optional and in {@link #areaUnit}.
 * Amenities are linked through {@link PropertyApartmentAmenity}.
 */
@Entity
@Table(name = "property_apartments")
@SoftDelete(strategy = SoftDeleteType.TIMESTAMP, columnName = "deleted_at")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyApartment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	/** Must be a project the current user may edit; never moved to another project. */
	@NotNull
	@Column(name = "property_project_id", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Long propertyProjectId;

	@NotBlank
	@Size(max = 100)
	@Column(name = "apartment_name", nullable = false, length = 100)
	private String apartmentName;

	@NotNull
	@Column(name = "apartment_type", nullable = false, length = 20)
	private ApartmentType apartmentType;

	@NotNull
	@PositiveOrZero
	@Column(name = "starting_price", nullable = false, precision = 14, scale = 2)
	private BigDecimal startingPrice;

	/** ISO 4217 code. */
	@NotNull
	@Pattern(regexp = "^[A-Z]{3}$")
	@Column(nullable = false, length = 3)
	private String currency = "INR";

	@Size(max = 10_000)
	private String description;

	@NotNull
	@PositiveOrZero
	@Column(nullable = false)
	private Short bedrooms;

	@NotNull
	@PositiveOrZero
	@Column(nullable = false)
	private Short bathrooms;

	@PositiveOrZero
	@Column(nullable = false)
	private short balconies;

	@PositiveOrZero
	@Column(name = "car_parking", nullable = false)
	private short carParking;

	@Positive
	@Column(name = "area_min", precision = 10, scale = 2)
	private BigDecimal areaMin;

	@Positive
	@Column(name = "area_max", precision = 10, scale = 2)
	private BigDecimal areaMax;

	@PositiveOrZero
	@Column(name = "carpet_area", precision = 10, scale = 2)
	private BigDecimal carpetArea;

	@PositiveOrZero
	@Column(name = "balcony_area", precision = 10, scale = 2)
	private BigDecimal balconyArea;

	@PositiveOrZero
	@Column(name = "built_up_area", precision = 10, scale = 2)
	private BigDecimal builtUpArea;

	@PositiveOrZero
	@Column(name = "super_built_up_area", precision = 10, scale = 2)
	private BigDecimal superBuiltUpArea;

	@NotNull
	@Column(name = "area_unit", nullable = false, length = 10)
	private AreaUnit areaUnit = AreaUnit.SQ_FT;

	@Size(max = 20)
	@JdbcTypeCode(SqlTypes.JSON)
	private List<@NotBlank @Size(max = 200) String> highlights;

	@PositiveOrZero
	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	// Read-only view; media rows own property_apartment_id (see PropertyProject#apartments).
	@OneToMany
	@JoinColumn(name = "property_apartment_id", insertable = false, updatable = false)
	@OrderBy("sortOrder ASC, id ASC")
	@Getter(AccessLevel.NONE)
	@Setter(AccessLevel.NONE)
	private List<PropertyApartmentMedia> media = new ArrayList<>();

	public PropertyApartment(Long propertyProjectId, String apartmentName, ApartmentType apartmentType,
			BigDecimal startingPrice, Short bedrooms, Short bathrooms) {
		this.propertyProjectId = propertyProjectId;
		this.apartmentName = apartmentName;
		this.apartmentType = apartmentType;
		this.startingPrice = startingPrice;
		this.bedrooms = bedrooms;
		this.bathrooms = bathrooms;
	}

	public List<PropertyApartmentMedia> getMedia() {
		return Collections.unmodifiableList(media);
	}

	@AssertTrue(message = "maximum area must not be less than minimum area")
	boolean isAreaRangeValid() {
		return areaMin == null || areaMax == null || areaMax.compareTo(areaMin) >= 0;
	}

	@AssertTrue(message = "area unit must be sq_ft or sq_m")
	boolean isAreaUnitSupported() {
		return areaUnit == null || areaUnit == AreaUnit.SQ_FT || areaUnit == AreaUnit.SQ_M;
	}

}
