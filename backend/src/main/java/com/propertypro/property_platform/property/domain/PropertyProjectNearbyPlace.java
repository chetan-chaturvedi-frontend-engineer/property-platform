package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A place near a project, shared by all its apartment configurations. Distances entered by owners
 * are {@link DistanceSource#MANUAL} and must not be presented as verified.
 */
@Entity
@Table(name = "property_project_nearby_places")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyProjectNearbyPlace {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotNull
	@Column(name = "property_project_id", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Long propertyProjectId;

	@NotBlank
	@Size(max = 150)
	@Column(name = "place_name", nullable = false, length = 150)
	private String placeName;

	@NotNull
	@Column(name = "place_type", nullable = false, length = 30)
	private NearbyPlaceType placeType;

	@NotNull
	@PositiveOrZero
	@DecimalMax("99999.99")
	@Column(name = "distance_km", nullable = false, precision = 7, scale = 2)
	@Setter(AccessLevel.NONE)
	private BigDecimal distanceKm;

	@NotNull
	@Column(name = "distance_source", nullable = false, length = 20)
	@Setter(AccessLevel.NONE)
	private DistanceSource distanceSource = DistanceSource.MANUAL;

	@DecimalMin("-90")
	@DecimalMax("90")
	@Column(precision = 9, scale = 6)
	@Setter(AccessLevel.NONE)
	private BigDecimal latitude;

	@DecimalMin("-180")
	@DecimalMax("180")
	@Column(precision = 9, scale = 6)
	@Setter(AccessLevel.NONE)
	private BigDecimal longitude;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public PropertyProjectNearbyPlace(Long propertyProjectId, String placeName, NearbyPlaceType placeType,
			BigDecimal distanceKm) {
		this.propertyProjectId = propertyProjectId;
		this.placeName = placeName;
		this.placeType = placeType;
		this.distanceKm = distanceKm;
	}

	/** Distance entered by a person; marks it unverified. */
	public void setManualDistance(BigDecimal distanceKm) {
		this.distanceKm = distanceKm;
		this.distanceSource = DistanceSource.MANUAL;
	}

	/** Only for distances calculated by the configured mapping service. */
	public void setCalculatedDistance(BigDecimal distanceKm) {
		this.distanceKm = distanceKm;
		this.distanceSource = DistanceSource.MAP_SERVICE;
	}

	public void setLocation(BigDecimal latitude, BigDecimal longitude) {
		this.latitude = latitude;
		this.longitude = longitude;
	}

	@AssertTrue(message = "latitude and longitude must be provided together")
	boolean isLocationComplete() {
		return (latitude == null) == (longitude == null);
	}

}
