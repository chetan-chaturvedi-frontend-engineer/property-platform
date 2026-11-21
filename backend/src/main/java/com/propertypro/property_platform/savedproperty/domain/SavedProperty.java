package com.propertypro.property_platform.savedproperty.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** One property on a user's shortlist ({@code saved_properties}); at most one row per user and property. */
@Entity
@Table(name = "saved_properties")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavedProperty {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(name = "property_id", nullable = false, updatable = false)
	private Long propertyId;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public SavedProperty(Long userId, Long propertyId) {
		this.userId = userId;
		this.propertyId = propertyId;
	}

}
