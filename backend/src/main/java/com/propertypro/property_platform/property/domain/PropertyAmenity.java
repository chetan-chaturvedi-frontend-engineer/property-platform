package com.propertypro.property_platform.property.domain;

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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Amenities master catalog entry. Managed only through admin endpoints; owners can only link
 * active amenities to their projects and apartments. Deactivate instead of deleting.
 */
@Entity
@Table(name = "property_amenities")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyAmenity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Setter(AccessLevel.NONE)
	private Long id;

	@NotBlank
	@Size(max = 100)
	@Column(nullable = false, length = 100)
	private String name;

	@NotNull
	@Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$")
	@Size(max = 120)
	@Column(nullable = false, unique = true, length = 120)
	private String slug;

	@Size(max = 50)
	@Column(length = 50)
	private String category;

	@Size(max = 2000)
	private String description;

	/** UI icon identifier, not a URL. */
	@Size(max = 100)
	@Column(length = 100)
	private String icon;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	@Setter(AccessLevel.NONE)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	@Setter(AccessLevel.NONE)
	private Instant updatedAt;

	public PropertyAmenity(String name, String slug) {
		this.name = name;
		this.slug = slug;
	}

}
