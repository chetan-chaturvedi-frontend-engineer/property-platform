package com.propertypro.property_platform.property.mapper;

import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyApartmentMedia;
import com.propertypro.property_platform.property.domain.PropertyMediaFile;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.dto.ApartmentResponse;
import com.propertypro.property_platform.property.dto.MediaResponse;
import com.propertypro.property_platform.property.dto.NearbyPlaceResponse;
import com.propertypro.property_platform.property.dto.PropertyResponse;
import com.propertypro.property_platform.property.dto.PublicPropertyResponse;
import com.propertypro.property_platform.property.dto.StatusChangeResponse;
import com.propertypro.property_platform.property.repository.ApartmentAmenityRow;
import com.propertypro.property_platform.property.repository.PropertyAmenityRepository;
import com.propertypro.property_platform.property.repository.PropertyApartmentMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectNearbyPlaceRepository;
import com.propertypro.property_platform.property.repository.PropertyStatusChangeRepository;
import com.propertypro.property_platform.property.service.PropertyWizardService;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Builds property responses with a fixed number of queries (no per-apartment queries). Media URLs
 * point at API endpoints that authorize the download; storage keys never leave the server.
 */
@Component
@RequiredArgsConstructor
public class PropertyResponseMapper {

	private static final String PRIVATE_BASE = "/api/v1/properties/";
	private static final String PUBLIC_BASE = "/api/v1/public/properties/";
	/** The admin dashboard's session cookie is only sent to /api/v1/admin, so its media URLs live there. */
	private static final String ADMIN_BASE = "/api/v1/admin/properties/";

	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyApartmentMediaRepository apartmentMediaRepository;
	private final PropertyProjectMediaRepository projectMediaRepository;
	private final PropertyProjectNearbyPlaceRepository nearbyPlaceRepository;
	private final PropertyAmenityRepository amenityRepository;
	private final PropertyStatusChangeRepository statusChangeRepository;
	private final PropertyWizardService wizardService;
	private final UserAccountService userAccountService;

	/** Owner view: no owner details and no audit actors. */
	public PropertyResponse toResponse(PropertyProject project) {
		return toResponse(project, false);
	}

	/** Admin view: adds owner contact details and who made each status change. */
	public PropertyResponse toAdminResponse(PropertyProject project) {
		return toResponse(project, true);
	}

	public PublicPropertyResponse toPublicResponse(PropertyProject p) {
		String base = PUBLIC_BASE + p.getSlug();
		return new PublicPropertyResponse(p.getId(), p.getSlug(), p.getPropertyType(), p.getProjectName(),
				p.getBuilderCompanyName(), p.getReraNumber(), location(p), apartments(p, base),
				p.getTotalTowersBlocks(), p.getTotalUnitsFlats(), p.getProjectStatus(), p.getLegalApprovalStatus(),
				p.getLandArea(), p.getLandAreaUnit(), p.getPossessionStartDate(), p.getPossessionEndDate(),
				p.getProjectDescription(), copy(p.getProjectHighlights()),
				amenityRepository.findLinkedToProject(p.getId()).stream().map(AmenityResponse::from).toList(),
				projectMedia(p, base), p.getThreeDTourUrl(), nearbyPlaces(p), p.getPublishedAt());
	}

	/** Admin URL of a project photo: its external URL, or the admin content path of an uploaded file. */
	public String toAdminMediaUrl(Long projectId, PropertyProjectMedia media) {
		return media.getExternalUrl() != null ? media.getExternalUrl()
				: ADMIN_BASE + projectId + "/media/" + media.getId() + "/content";
	}

	/** Public URL of a project photo: its external URL, or the public content path of an uploaded file. */
	public String toPublicMediaUrl(String slug, PropertyProjectMedia media) {
		return media.getExternalUrl() != null ? media.getExternalUrl()
				: PUBLIC_BASE + slug + "/media/" + media.getId() + "/content";
	}

	public ApartmentResponse toApartmentResponse(PropertyProject project, PropertyApartment apartment) {
		String base = PRIVATE_BASE + project.getId();
		List<AmenityResponse> amenities = amenityRepository.findLinkedToApartment(apartment.getId()).stream()
			.map(AmenityResponse::from).toList();
		List<MediaResponse> media = apartmentMediaRepository
			.findByPropertyApartmentIdOrderBySortOrderAscIdAsc(apartment.getId()).stream()
			.map(m -> toMediaResponse(m, base)).toList();
		return apartment(apartment, amenities, media);
	}

	public List<ApartmentResponse> toApartmentResponses(PropertyProject project) {
		return apartments(project, PRIVATE_BASE + project.getId());
	}

	public MediaResponse toMediaResponse(PropertyProjectMedia media, PropertyProject project) {
		return toMediaResponse(media, PRIVATE_BASE + project.getId());
	}

	public MediaResponse toMediaResponse(PropertyApartmentMedia media, PropertyProject project) {
		return toMediaResponse(media, PRIVATE_BASE + project.getId());
	}

	public List<MediaResponse> toProjectMediaResponses(PropertyProject project) {
		return projectMedia(project, PRIVATE_BASE + project.getId());
	}

	public List<NearbyPlaceResponse> toNearbyPlaceResponses(PropertyProject project) {
		return nearbyPlaces(project);
	}

	private PropertyResponse toResponse(PropertyProject p, boolean admin) {
		String base = (admin ? ADMIN_BASE : PRIVATE_BASE) + p.getId();
		UserSummary owner = admin ? userAccountService.findSummaries(List.of(p.getUserId())).get(p.getUserId()) : null;
		List<StatusChangeResponse> history = statusChangeRepository
			.findByPropertyProjectIdOrderByCreatedAtAscIdAsc(p.getId()).stream()
			.map(c -> new StatusChangeResponse(c.getAction(), c.getFromStatus(), c.getToStatus(), c.getReason(),
					c.getCreatedAt(), admin ? c.getActorUserId() : null))
			.toList();
		return new PropertyResponse(p.getId(), p.getSlug(), p.getVersion(), p.getPublicationStatus(),
				new PropertyResponse.Details(p.getPropertyType(), p.getProjectName(), p.getBuilderCompanyName(),
						p.getReraNumber(), p.getGstNumber(), p.getProjectEmail(), p.getProjectPhone()),
				location(p), apartments(p, base),
				new PropertyResponse.ProjectInfo(p.getTotalTowersBlocks(), p.getTotalUnitsFlats(), p.getProjectStatus(),
						p.getLegalApprovalStatus(), p.getLandArea(), p.getLandAreaUnit(), p.getPossessionStartDate(),
						p.getPossessionEndDate(), p.getProjectDescription(), copy(p.getProjectHighlights())),
				amenityRepository.findLinkedToProject(p.getId()).stream().map(AmenityResponse::from).toList(),
				projectMedia(p, base), p.getThreeDTourUrl(), nearbyPlaces(p), wizardService.evaluate(p), history,
				p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(), owner, null);
	}

	private static PropertyResponse.Location location(PropertyProject p) {
		return new PropertyResponse.Location(p.getProjectAddress(), p.getCity(), p.getLocality(), p.getPincode(),
				p.getState(), p.getLandmark(), p.getLatitude(), p.getLongitude());
	}

	private List<ApartmentResponse> apartments(PropertyProject project, String base) {
		List<PropertyApartment> apartments = apartmentRepository
			.findByPropertyProjectIdOrderByDisplayOrderAscIdAsc(project.getId());
		if (apartments.isEmpty()) {
			return List.of();
		}
		List<Long> ids = apartments.stream().map(PropertyApartment::getId).toList();
		Map<Long, List<MediaResponse>> media = apartmentMediaRepository
			.findByPropertyApartmentIdInOrderBySortOrderAscIdAsc(ids).stream()
			.collect(Collectors.groupingBy(PropertyApartmentMedia::getPropertyApartmentId,
					Collectors.mapping(m -> toMediaResponse(m, base), Collectors.toList())));
		Map<Long, List<AmenityResponse>> amenities = amenityRepository.findLinkedToApartments(ids).stream()
			.collect(Collectors.groupingBy(ApartmentAmenityRow::apartmentId,
					Collectors.mapping(row -> AmenityResponse.from(row.amenity()), Collectors.toList())));
		return apartments.stream()
			.map(a -> apartment(a, amenities.getOrDefault(a.getId(), List.of()), media.getOrDefault(a.getId(), List.of())))
			.toList();
	}

	private static ApartmentResponse apartment(PropertyApartment a, List<AmenityResponse> amenities,
			List<MediaResponse> media) {
		return new ApartmentResponse(a.getId(), a.getApartmentName(), a.getApartmentType(), a.getStartingPrice(),
				a.getCurrency(), a.getDescription(), a.getBedrooms(), a.getBathrooms(), a.getBalconies(),
				a.getCarParking(), a.getAreaMin(), a.getAreaMax(), a.getCarpetArea(), a.getBalconyArea(),
				a.getBuiltUpArea(), a.getSuperBuiltUpArea(), a.getAreaUnit(), copy(a.getHighlights()),
				a.getDisplayOrder(), amenities, media, a.getCreatedAt(), a.getUpdatedAt());
	}

	private List<MediaResponse> projectMedia(PropertyProject project, String base) {
		return projectMediaRepository.findByPropertyProjectIdOrderBySortOrderAscIdAsc(project.getId()).stream()
			.map(m -> toMediaResponse(m, base)).toList();
	}

	private List<NearbyPlaceResponse> nearbyPlaces(PropertyProject project) {
		return nearbyPlaceRepository.findByPropertyProjectIdOrderByDistanceKmAscIdAsc(project.getId()).stream()
			.map(NearbyPlaceResponse::from).toList();
	}

	private static MediaResponse toMediaResponse(PropertyProjectMedia m, String base) {
		return media(m, m.getMediaType().getValue(), base + "/media/" + m.getId() + "/content");
	}

	private static MediaResponse toMediaResponse(PropertyApartmentMedia m, String base) {
		return media(m, m.getMediaType().getValue(),
				base + "/apartments/" + m.getPropertyApartmentId() + "/media/" + m.getId() + "/content");
	}

	private static MediaResponse media(PropertyMediaFile m, String mediaType, String contentPath) {
		boolean external = m.getExternalUrl() != null;
		return new MediaResponse(m.getId(), mediaType, external ? m.getExternalUrl() : contentPath, external,
				m.getMimeType(), m.getFileSize(), m.getOriginalFilename(), m.getTitle(), m.getDescription(),
				m.getSortOrder(), m.isPrimary(), m.getCreatedAt());
	}

	private static List<String> copy(List<String> values) {
		return values == null ? List.of() : List.copyOf(values);
	}

}
