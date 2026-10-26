package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.domain.Persistable;

import java.io.Serializable;
import java.time.Instant;

/**
 * Link between a {@link PropertyApartment} and an amenity ({@code property_apartment_amenities}). Mapped as an entity rather than
 * a {@code @ManyToMany}: Hibernate would otherwise apply the parent's soft delete to this table.
 * Removing a link deletes the row; the composite primary key rejects duplicate links.
 */
@Entity
@Table(name = "property_apartment_amenities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyApartmentAmenity implements Persistable<PropertyApartmentAmenity.Id> {

	@EmbeddedId
	private Id id;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	// The id is assigned in code, so tell Spring Data the entity is new to skip a SELECT before INSERT.
	@Transient
	private boolean isNew = true;

	/** The caller must check that the apartment is the user's and the amenity is active. */
	public PropertyApartmentAmenity(Long propertyApartmentId, Long propertyAmenityId) {
		this.id = new Id(propertyApartmentId, propertyAmenityId);
	}

	@Override
	public boolean isNew() {
		return isNew;
	}

	@PostLoad
	@PostPersist
	void markNotNew() {
		isNew = false;
	}

	@Embeddable
	public record Id(
			@Column(name = "property_apartment_id", nullable = false, updatable = false) Long propertyApartmentId,
			@Column(name = "property_amenity_id", nullable = false, updatable = false) Long propertyAmenityId)
			implements Serializable {
	}

}
