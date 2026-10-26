package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.ApartmentMediaType;
import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.LegalApprovalStatus;
import com.propertypro.property_platform.property.domain.NearbyPlaceType;
import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyAmenity;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyApartmentAmenity;
import com.propertypro.property_platform.property.domain.PropertyApartmentMedia;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectAmenity;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.domain.PropertyProjectNearbyPlace;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.service.ProjectSlugGenerator;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Runs against the test PostgreSQL database with Flyway migrations; each test is rolled back.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(ProjectSlugGenerator.class)
class PropertySchemaTests {

	@Autowired
	private PropertyProjectRepository projectRepository;

	@Autowired
	private PropertyApartmentRepository apartmentRepository;

	@Autowired
	private PropertyProjectMediaRepository projectMediaRepository;

	@Autowired
	private PropertyApartmentMediaRepository apartmentMediaRepository;

	@Autowired
	private PropertyProjectNearbyPlaceRepository nearbyPlaceRepository;

	@Autowired
	private PropertyAmenityRepository amenityRepository;

	@Autowired
	private PropertyProjectAmenityRepository projectAmenityRepository;

	@Autowired
	private PropertyApartmentAmenityRepository apartmentAmenityRepository;

	@Autowired
	private ProjectSlugGenerator slugGenerator;

	@Autowired
	private TestEntityManager entityManager;

	@Autowired
	private JdbcTemplate jdbc;

	private Long ownerId;

	@BeforeEach
	void createOwner() {
		ownerId = insertUser("owner@example.com");
	}

	@Test
	void newProjectGetsDefaultsAndStoresLowercaseValues() {
		PropertyProject project = newProject("green-valley-residency-pune");
		project.setProjectHighlights(List.of("Lake view", "Near IT park"));
		project.setLocation(new BigDecimal("18.559000"), new BigDecimal("73.786800"));
		projectRepository.saveAndFlush(project);
		entityManager.clear();

		PropertyProject loaded = projectRepository.findById(project.getId()).orElseThrow();
		assertThat(loaded.getProjectStatus()).isEqualTo(ProjectStatus.UPCOMING);
		assertThat(loaded.getPublicationStatus()).isEqualTo(PublicationStatus.DRAFT);
		assertThat(loaded.getLegalApprovalStatus()).isEqualTo(LegalApprovalStatus.PENDING);
		assertThat(loaded.getProjectHighlights()).containsExactly("Lake view", "Near IT park");
		assertThat(loaded.getLatitude()).isEqualByComparingTo("18.559");
		assertThat(loaded.getCreatedAt()).isNotNull();
		assertThat(loaded.getUpdatedAt()).isNotNull();

		Map<String, Object> row = jdbc.queryForMap("""
				SELECT property_type, project_status, publication_status, legal_approval_status,
				       jsonb_typeof(project_highlights) AS highlights_type
				FROM property_projects WHERE id = ?""", project.getId());
		assertThat(row).containsEntry("property_type", "apartment")
				.containsEntry("project_status", "upcoming")
				.containsEntry("publication_status", "draft")
				.containsEntry("legal_approval_status", "pending")
				.containsEntry("highlights_type", "array");
	}

	@Test
	void relationshipsResolve() {
		PropertyProject project = projectRepository.save(newProject("relations"));
		Long projectId = project.getId();

		// Several configurations of the same BHK type are allowed.
		PropertyApartment typeB = newApartment(projectId, "2 BHK Type B");
		typeB.setDisplayOrder(2);
		PropertyApartment typeA = newApartment(projectId, "2 BHK Type A");
		typeA.setDisplayOrder(1);
		typeA.setAreaMin(new BigDecimal("950"));
		typeA.setAreaMax(new BigDecimal("1100"));
		typeA.setHighlights(List.of("Corner unit"));
		apartmentRepository.saveAll(List.of(typeB, typeA));

		PropertyProjectMedia cover = PropertyProjectMedia.storedFile(projectId, ProjectMediaType.PHOTO,
				"projects/4f1c/cover.jpg", "image/jpeg", 120_000, "IMG_001.jpg");
		cover.setPrimary(true);
		projectMediaRepository.saveAll(List.of(cover,
				PropertyProjectMedia.storedFile(projectId, ProjectMediaType.PHOTO, "projects/4f1c/2.jpg", "image/jpeg",
						90_000, null),
				PropertyProjectMedia.externalUrl(projectId, ProjectMediaType.VIDEO, "https://videos.example.com/tour")));

		apartmentMediaRepository.saveAll(List.of(
				PropertyApartmentMedia.storedFile(typeA.getId(), ApartmentMediaType.FLOOR_PLAN_IMAGE,
						"apartments/9a2e/plan-1.png", "image/png", 50_000, null),
				PropertyApartmentMedia.storedFile(typeA.getId(), ApartmentMediaType.FLOOR_PLAN_IMAGE,
						"apartments/9a2e/plan-2.png", "image/png", 51_000, null),
				PropertyApartmentMedia.storedFile(typeA.getId(), ApartmentMediaType.PLAN_PDF,
						"apartments/9a2e/plan.pdf", "application/pdf", 300_000, null)));

		nearbyPlaceRepository.saveAll(List.of(
				new PropertyProjectNearbyPlace(projectId, "City Hospital", NearbyPlaceType.HOSPITAL, new BigDecimal("2.5")),
				new PropertyProjectNearbyPlace(projectId, "Baner Metro", NearbyPlaceType.METRO_STATION,
						new BigDecimal("0.8"))));

		PropertyAmenity pool = amenityRepository.findBySlug("swimming-pool").orElseThrow();
		PropertyAmenity gym = amenityRepository.findBySlug("gymnasium").orElseThrow();
		PropertyAmenity parking = amenityRepository.findBySlug("covered-parking").orElseThrow();
		projectAmenityRepository.saveAll(List.of(new PropertyProjectAmenity(projectId, pool.getId()),
				new PropertyProjectAmenity(projectId, gym.getId())));
		apartmentAmenityRepository.save(new PropertyApartmentAmenity(typeA.getId(), parking.getId()));
		entityManager.flush();
		entityManager.clear();

		PropertyProject loaded = projectRepository.findById(projectId).orElseThrow();
		assertThat(loaded.getApartments()).extracting(PropertyApartment::getApartmentName)
				.containsExactly("2 BHK Type A", "2 BHK Type B");
		assertThat(loaded.getApartments()).extracting(PropertyApartment::getApartmentType)
				.containsOnly(ApartmentType.TWO_BHK);
		assertThat(loaded.getMedia()).hasSize(3).filteredOn(PropertyProjectMedia::isPrimary).hasSize(1);
		assertThat(loaded.getNearbyPlaces()).extracting(PropertyProjectNearbyPlace::getPlaceName)
				.containsExactly("Baner Metro", "City Hospital");

		PropertyApartment loadedA = loaded.getApartments().get(0);
		assertThat(loadedA.getPropertyProjectId()).isEqualTo(projectId);
		assertThat(loadedA.getMedia()).hasSize(3);
		assertThat(loadedA.getHighlights()).containsExactly("Corner unit");
		assertThat(loadedA.getCurrency()).isEqualTo("INR");

		assertThat(amenityRepository.findLinkedToProject(projectId)).extracting(PropertyAmenity::getSlug)
				.containsExactly("gymnasium", "swimming-pool");
		assertThat(amenityRepository.findLinkedToApartment(loadedA.getId())).extracting(PropertyAmenity::getSlug)
				.containsExactly("covered-parking");
		assertThat(projectRepository.findByUserId(ownerId, PageRequest.of(0, 10))).hasSize(1);
	}

	@Test
	void ownerScopedLookupHidesOtherUsersProjects() {
		PropertyProject project = projectRepository.saveAndFlush(newProject("owned"));
		Long otherUserId = insertUser("other@example.com");

		assertThat(projectRepository.findByIdAndUserId(project.getId(), ownerId)).isPresent();
		assertThat(projectRepository.findByIdAndUserId(project.getId(), otherUserId)).isEmpty();
		assertThat(project.isOwnedBy(otherUserId)).isFalse();
	}

	@Test
	void amenityCatalogIsSeeded() {
		assertThat(amenityRepository.count()).isEqualTo(12);
		assertThat(amenityRepository.findBySlug("childrens-play-area")).get()
				.extracting(PropertyAmenity::getName).isEqualTo("Children's play area");
	}

	@Test
	void projectRequiresExistingUser() {
		assertThatThrownBy(() -> projectRepository.saveAndFlush(new ProjectWithOwner(999_999L).project()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void apartmentRequiresExistingProject() {
		assertThatThrownBy(() -> apartmentRepository.saveAndFlush(newApartment(999_999L, "Orphan")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void mediaAndNearbyPlacesRequireExistingParents() {
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO property_project_nearby_places (property_project_id, place_name, place_type, distance_km)
				VALUES (999999, 'School', 'school', 1)"""))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void duplicateSlugIsRejected() {
		projectRepository.saveAndFlush(newProject("same-slug"));

		assertThatThrownBy(() -> projectRepository.saveAndFlush(newProject("same-slug")))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("uq_property_projects_slug");
	}

	@Test
	void malformedSlugIsRejectedByDatabase() {
		PropertyProject project = projectRepository.saveAndFlush(newProject("valid-slug"));

		assertThatThrownBy(() -> jdbc.update("UPDATE property_projects SET slug = 'Bad Slug' WHERE id = ?",
				project.getId()))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("chk_property_projects_slug_format");
	}

	@Test
	void slugGeneratorAddsSuffixForTakenSlugsIncludingSoftDeleted() {
		String first = slugGenerator.generate("Green Valley Residency", "Pune");
		assertThat(first).isEqualTo("green-valley-residency-pune");
		PropertyProject project = projectRepository.saveAndFlush(newProject(first));

		projectRepository.delete(project);
		projectRepository.flush();

		assertThat(slugGenerator.generate("Green Valley Residency!", "pune")).isEqualTo("green-valley-residency-pune-2");
	}

	@Test
	void duplicateAmenityLinksAreRejected() {
		PropertyProject project = projectRepository.saveAndFlush(newProject("amenity-links"));
		PropertyApartment apartment = apartmentRepository.saveAndFlush(newApartment(project.getId(), "3 BHK"));
		Long poolId = amenityRepository.findBySlug("swimming-pool").orElseThrow().getId();
		projectAmenityRepository.saveAndFlush(new PropertyProjectAmenity(project.getId(), poolId));
		apartmentAmenityRepository.saveAndFlush(new PropertyApartmentAmenity(apartment.getId(), poolId));
		entityManager.clear();

		// The same amenity on the project and on its apartment is fine; a second identical link is not.
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO property_apartment_amenities (property_apartment_id, property_amenity_id) VALUES (?, ?)",
				apartment.getId(), poolId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void duplicateProjectAmenityLinkIsRejected() {
		PropertyProject project = projectRepository.saveAndFlush(newProject("project-amenity-dup"));
		Long gymId = amenityRepository.findBySlug("gymnasium").orElseThrow().getId();
		projectAmenityRepository.saveAndFlush(new PropertyProjectAmenity(project.getId(), gymId));
		entityManager.clear();

		assertThatThrownBy(() -> projectAmenityRepository.saveAndFlush(new PropertyProjectAmenity(project.getId(), gymId)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void amenityInUseCannotBeDeleted() {
		PropertyProject project = projectRepository.saveAndFlush(newProject("amenity-in-use"));
		Long liftId = amenityRepository.findBySlug("lift").orElseThrow().getId();
		projectAmenityRepository.saveAndFlush(new PropertyProjectAmenity(project.getId(), liftId));

		assertThatThrownBy(() -> jdbc.update("DELETE FROM property_amenities WHERE id = ?", liftId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void onlyOnePrimaryPhotoPerProject() {
		Long projectId = projectRepository.saveAndFlush(newProject("primary-photo")).getId();
		PropertyProjectMedia first = PropertyProjectMedia.storedFile(projectId, ProjectMediaType.PHOTO, "p/1.jpg",
				"image/jpeg", 10, null);
		first.setPrimary(true);
		projectMediaRepository.saveAndFlush(first);
		PropertyProjectMedia second = PropertyProjectMedia.storedFile(projectId, ProjectMediaType.PHOTO, "p/2.jpg",
				"image/jpeg", 10, null);
		second.setPrimary(true);

		assertThatThrownBy(() -> projectMediaRepository.saveAndFlush(second))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("uq_property_project_media_primary");
	}

	@Test
	void mediaNeedsExactlyOneValidSource() {
		Long projectId = projectRepository.saveAndFlush(newProject("media-source")).getId();

		assertThatThrownBy(() -> projectMediaRepository.saveAndFlush(
				PropertyProjectMedia.storedFile(projectId, ProjectMediaType.BROCHURE, "/etc/passwd", "application/pdf",
						10, null)))
				.isInstanceOf(ConstraintViolationException.class);
		assertThatThrownBy(() -> projectMediaRepository.saveAndFlush(
				PropertyProjectMedia.externalUrl(projectId, ProjectMediaType.VIDEO, "http://insecure.example.com/v")))
				.isInstanceOf(ConstraintViolationException.class);
		// Database backstop: no source at all.
		assertThatThrownBy(() -> jdbc.update(
				"INSERT INTO property_project_media (property_project_id, media_type) VALUES (?, 'photo')", projectId))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("chk_property_project_media_source");
	}

	@Test
	void coordinatesMustBePairedAndInRange() {
		PropertyProject onlyLatitude = newProject("only-latitude");
		onlyLatitude.setLocation(new BigDecimal("18.5"), null);
		assertThatThrownBy(() -> projectRepository.saveAndFlush(onlyLatitude))
				.isInstanceOf(ConstraintViolationException.class)
				.hasMessageContaining("latitude and longitude must be provided together");

		PropertyProject outOfRange = newProject("out-of-range");
		outOfRange.setLocation(new BigDecimal("91"), new BigDecimal("73"));
		assertThatThrownBy(() -> projectRepository.saveAndFlush(outOfRange))
				.isInstanceOf(ConstraintViolationException.class);
	}

	@Test
	void apartmentAreaRangeIsValidated() {
		Long projectId = projectRepository.saveAndFlush(newProject("apartment-area-range")).getId();

		PropertyApartment inverted = newApartment(projectId, "Inverted");
		inverted.setAreaMin(new BigDecimal("1200"));
		inverted.setAreaMax(new BigDecimal("1000"));
		assertThatThrownBy(() -> apartmentRepository.saveAndFlush(inverted))
				.isInstanceOf(ConstraintViolationException.class)
				.hasMessageContaining("maximum area must not be less than minimum area");
	}

	@Test
	void apartmentPriceMustNotBeNegative() {
		Long projectId = projectRepository.saveAndFlush(newProject("apartment-price")).getId();

		PropertyApartment negativePrice = new PropertyApartment(projectId, "Negative", ApartmentType.ONE_BHK,
				new BigDecimal("-1"), (short) 1, (short) 1);
		assertThatThrownBy(() -> apartmentRepository.saveAndFlush(negativePrice))
				.isInstanceOf(ConstraintViolationException.class);
	}

	@Test
	void apartmentAreaRangeIsCheckedByDatabase() {
		Long projectId = projectRepository.saveAndFlush(newProject("apartment-area-db")).getId();

		Long apartmentId = apartmentRepository.saveAndFlush(newApartment(projectId, "Valid")).getId();
		assertThatThrownBy(() -> jdbc.update(
				"UPDATE property_apartments SET area_min = 1200, area_max = 1000 WHERE id = ?", apartmentId))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("chk_property_apartments_area_range");
	}

	@Test
	void nearbyPlaceDistanceMustNotBeNegative() {
		Long projectId = projectRepository.saveAndFlush(newProject("nearby")).getId();
		PropertyProjectNearbyPlace place = nearbyPlaceRepository.saveAndFlush(
				new PropertyProjectNearbyPlace(projectId, "Airport", NearbyPlaceType.AIRPORT, new BigDecimal("12.40")));
		assertThat(jdbc.queryForObject("SELECT distance_source FROM property_project_nearby_places WHERE id = ?",
				String.class, place.getId())).isEqualTo("manual");

		assertThatThrownBy(() -> nearbyPlaceRepository.saveAndFlush(
				new PropertyProjectNearbyPlace(projectId, "Nowhere", NearbyPlaceType.OTHER, new BigDecimal("-1"))))
				.isInstanceOf(ConstraintViolationException.class);
		assertThatThrownBy(() -> jdbc.update(
				"UPDATE property_project_nearby_places SET distance_km = -1 WHERE id = ?", place.getId()))
				.isInstanceOf(DataIntegrityViolationException.class)
				.hasMessageContaining("chk_property_project_nearby_places_distance_km");
	}

	@Test
	void softDeleteHidesProjectButKeepsChildren() {
		PropertyProject project = projectRepository.save(newProject("soft-delete"));
		Long projectId = project.getId();
		PropertyApartment apartment = apartmentRepository.save(newApartment(projectId, "2 BHK"));
		projectMediaRepository.save(PropertyProjectMedia.storedFile(projectId, ProjectMediaType.BROCHURE,
				"projects/x/brochure.pdf", "application/pdf", 1000, null));
		apartmentMediaRepository.save(PropertyApartmentMedia.storedFile(apartment.getId(),
				ApartmentMediaType.PLAN_PDF, "apartments/x/plan.pdf", "application/pdf", 1000, null));
		entityManager.flush();
		entityManager.clear();

		projectRepository.delete(projectRepository.findById(projectId).orElseThrow());
		projectRepository.flush();
		entityManager.clear();

		assertThat(projectRepository.findById(projectId)).isEmpty();
		assertThat(projectRepository.findBySlug("soft-delete")).isEmpty();
		assertThat(count("SELECT count(*) FROM property_projects WHERE id = ? AND deleted_at IS NOT NULL", projectId))
				.isEqualTo(1);
		assertThat(count("SELECT count(*) FROM property_apartments WHERE property_project_id = ? AND deleted_at IS NULL",
				projectId)).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM property_project_media WHERE property_project_id = ?", projectId))
				.isEqualTo(1);
		assertThat(count("SELECT count(*) FROM property_apartment_media WHERE property_apartment_id = ?",
				apartment.getId())).isEqualTo(1);
	}

	@Test
	void softDeletedApartmentDisappearsFromProject() {
		Long projectId = projectRepository.save(newProject("apartment-soft-delete")).getId();
		PropertyApartment keep = apartmentRepository.save(newApartment(projectId, "Keep"));
		PropertyApartment remove = apartmentRepository.save(newApartment(projectId, "Remove"));
		entityManager.flush();

		apartmentRepository.delete(remove);
		entityManager.flush();
		entityManager.clear();

		assertThat(projectRepository.findById(projectId).orElseThrow().getApartments())
				.extracting(PropertyApartment::getId).containsExactly(keep.getId());
		assertThat(count("SELECT count(*) FROM property_apartments WHERE id = ? AND deleted_at IS NOT NULL",
				remove.getId())).isEqualTo(1);
	}

	private Long insertUser(String email) {
		return jdbc.queryForObject(
				"INSERT INTO users (email, password_hash, full_name) VALUES (?, 'hash', 'Owner') RETURNING id",
				Long.class, email);
	}

	private int count(String sql, Object... args) {
		return jdbc.queryForObject(sql, Integer.class, args);
	}

	private PropertyProject newProject(String slug) {
		return new ProjectWithOwner(ownerId).project(slug);
	}

	private static PropertyApartment newApartment(Long projectId, String name) {
		return new PropertyApartment(projectId, name, ApartmentType.TWO_BHK, new BigDecimal("7500000.00"), (short) 2,
				(short) 2);
	}

	private record ProjectWithOwner(Long ownerId) {

		PropertyProject project() {
			return project("project-" + ownerId);
		}

		PropertyProject project(String slug) {
			PropertyProject project = new PropertyProject(ownerId, slug);
			project.setPropertyType(PropertyType.APARTMENT);
			project.setProjectName("Green Valley Residency");
			project.setBuilderCompanyName("Green Builders Pvt Ltd");
			project.setProjectEmail("sales@greenbuilders.example.com");
			project.setProjectPhone("+919876543210");
			project.setProjectAddress("Plot 12, Baner Road");
			project.setCity("Pune");
			project.setLocality("Baner");
			project.setPincode("411045");
			project.setState("Maharashtra");
			return project;
		}

	}

}
