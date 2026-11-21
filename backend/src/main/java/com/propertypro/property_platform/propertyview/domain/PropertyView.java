package com.propertypro.property_platform.propertyview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * How often a user opened a published property and when last ({@code property_views}). Rows are written only by
 * the repository's upsert, so this entity is read-only.
 */
@Entity
@Table(name = "property_views")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyView {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private Long userId;

	@Column(name = "property_id", nullable = false, updatable = false)
	private Long propertyId;

	@Column(name = "view_count", nullable = false)
	private int viewCount;

	@Column(name = "first_viewed_at", nullable = false, updatable = false)
	private Instant firstViewedAt;

	@Column(name = "last_viewed_at", nullable = false)
	private Instant lastViewedAt;

}
