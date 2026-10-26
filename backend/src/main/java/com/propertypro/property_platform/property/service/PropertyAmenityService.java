package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.property.domain.PropertyAmenity;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyApartmentAmenity;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectAmenity;
import com.propertypro.property_platform.property.dto.AmenityResponse;
import com.propertypro.property_platform.property.repository.PropertyAmenityRepository;
import com.propertypro.property_platform.property.repository.PropertyApartmentAmenityRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectAmenityRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Amenity catalog (read-only here: owners only link catalog entries) and the project and apartment
 * amenity links (wizard step 5). Links are replaced as a whole, in one transaction.
 */
@Service
@RequiredArgsConstructor
public class PropertyAmenityService {

	private final PropertyAmenityRepository amenityRepository;
	private final PropertyProjectAmenityRepository projectAmenityRepository;
	private final PropertyApartmentAmenityRepository apartmentAmenityRepository;
	private final PropertyAccessService access;
	private final PropertyWizardService wizard;

	/** Active amenities, by category and name. */
	@Transactional(readOnly = true)
	public List<AmenityResponse> catalog() {
		return amenityRepository.findByActiveTrue(Sort.by("category", "name", "id")).stream()
			.map(AmenityResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public List<AmenityResponse> projectAmenities(Long propertyId, CurrentActor actor) {
		PropertyProject project = access.requireViewable(propertyId, actor);
		return amenityRepository.findLinkedToProject(project.getId()).stream().map(AmenityResponse::from).toList();
	}

	@Transactional
	public List<AmenityResponse> syncProjectAmenities(Long propertyId, CurrentActor actor, List<Long> amenityIds,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		Set<Long> requested = requireActive(amenityIds);
		List<PropertyProjectAmenity> links = projectAmenityRepository.findByIdPropertyProjectId(project.getId());
		Set<Long> linked = links.stream().map(l -> l.getId().propertyAmenityId()).collect(Collectors.toSet());
		projectAmenityRepository.deleteAll(links.stream()
			.filter(l -> !requested.contains(l.getId().propertyAmenityId())).toList());
		projectAmenityRepository.saveAll(requested.stream().filter(id -> !linked.contains(id))
			.map(id -> new PropertyProjectAmenity(project.getId(), id)).toList());
		projectAmenityRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return amenityRepository.findLinkedToProject(project.getId()).stream().map(AmenityResponse::from).toList();
	}

	@Transactional(readOnly = true)
	public List<AmenityResponse> apartmentAmenities(Long propertyId, Long apartmentId, CurrentActor actor) {
		PropertyApartment apartment = access.requireApartment(access.requireViewable(propertyId, actor), apartmentId);
		return amenityRepository.findLinkedToApartment(apartment.getId()).stream().map(AmenityResponse::from).toList();
	}

	@Transactional
	public List<AmenityResponse> syncApartmentAmenities(Long propertyId, Long apartmentId, CurrentActor actor,
			List<Long> amenityIds, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		Set<Long> requested = requireActive(amenityIds);
		List<PropertyApartmentAmenity> links = apartmentAmenityRepository.findByIdPropertyApartmentId(apartment.getId());
		Set<Long> linked = links.stream().map(l -> l.getId().propertyAmenityId()).collect(Collectors.toSet());
		apartmentAmenityRepository.deleteAll(links.stream()
			.filter(l -> !requested.contains(l.getId().propertyAmenityId())).toList());
		apartmentAmenityRepository.saveAll(requested.stream().filter(id -> !linked.contains(id))
			.map(id -> new PropertyApartmentAmenity(apartment.getId(), id)).toList());
		apartmentAmenityRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return amenityRepository.findLinkedToApartment(apartment.getId()).stream().map(AmenityResponse::from).toList();
	}

	/** Rejects duplicates and ids that are not active catalog amenities. */
	private Set<Long> requireActive(List<Long> amenityIds) {
		Set<Long> requested = new LinkedHashSet<>(amenityIds);
		if (requested.size() != amenityIds.size()) {
			throw new FieldValidationException("amenityIds", "must not contain duplicates");
		}
		if (requested.isEmpty()) {
			return requested;
		}
		Set<Long> active = amenityRepository.findByIdInAndActiveTrue(requested).stream()
			.map(PropertyAmenity::getId).collect(Collectors.toSet());
		Set<Long> invalid = new HashSet<>(requested);
		invalid.removeAll(active);
		if (!invalid.isEmpty()) {
			throw new FieldValidationException("amenityIds",
					"contains unknown or inactive amenities: " + invalid.stream().sorted().toList());
		}
		return requested;
	}

}
