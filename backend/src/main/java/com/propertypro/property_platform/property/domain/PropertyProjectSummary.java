package com.propertypro.property_platform.property.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.Instant;

/**
 * Read-only list view of {@code property_projects}. Unlike {@link PropertyProject} it is not
 * soft-delete filtered, so every query must state its own {@code deletedAt} condition (admins can
 * list deleted projects; everyone else must exclude them).
 */
@Entity
@Immutable
@Table(name = "property_projects")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PropertyProjectSummary {

	@Id
	private Long id;

	@Column(name = "user_id")
	private Long userId;

	private String slug;

	@Column(name = "property_type")
	private PropertyType propertyType;

	@Column(name = "project_name")
	private String projectName;

	@Column(name = "builder_company_name")
	private String builderCompanyName;

	private String city;

	private String locality;

	private String state;

	private String pincode;

	@Column(name = "project_status")
	private ProjectStatus projectStatus;

	@Column(name = "legal_approval_status")
	private LegalApprovalStatus legalApprovalStatus;

	@Column(name = "publication_status")
	private PublicationStatus publicationStatus;

	@Column(name = "wizard_step")
	private short wizardStep;

	private long version;

	@Column(name = "created_at")
	private Instant createdAt;

	@Column(name = "updated_at")
	private Instant updatedAt;

	@Column(name = "published_at")
	private Instant publishedAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

}
