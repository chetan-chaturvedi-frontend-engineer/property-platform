package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.AreaUnit;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.dto.ApartmentRequest;
import com.propertypro.property_platform.property.dto.ApartmentResponse;
import com.propertypro.property_platform.property.dto.SyncApartmentsRequest;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Apartment configurations (wizard step 3). Each one is a unit type with its own layout, so a property
 * may have several of the same {@link ApartmentType}. Deleting is a soft delete; media is kept.
 */
@Service
@RequiredArgsConstructor
public class PropertyApartmentService {

	static final int MAX_APARTMENTS = 50;

	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyAccessService access;
	private final PropertyWizardService wizard;
	private final PropertyResponseMapper mapper;

	@Transactional(readOnly = true)
	public List<ApartmentResponse> list(Long propertyId, CurrentActor actor) {
		return mapper.toApartmentResponses(access.requireViewable(propertyId, actor));
	}

	@Transactional(readOnly = true)
	public ApartmentResponse get(Long propertyId, Long apartmentId, CurrentActor actor) {
		PropertyProject project = access.requireViewable(propertyId, actor);
		return mapper.toApartmentResponse(project, access.requireApartment(project, apartmentId));
	}

	@Transactional
	public ApartmentResponse create(Long propertyId, CurrentActor actor, ApartmentRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		if (request.id() != null) {
			throw new FieldValidationException("id", "is not allowed");
		}
		if (apartmentRepository.countByPropertyProjectId(project.getId()) >= MAX_APARTMENTS) {
			throw PropertyExceptions.apartmentLimitReached(MAX_APARTMENTS);
		}
		PropertyApartment apartment = newApartment(project, request, "");
		apartment.setDisplayOrder(request.displayOrder() != null ? request.displayOrder()
				: apartmentRepository.maxDisplayOrder(project.getId()) + 1);
		apartmentRepository.saveAndFlush(apartment);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toApartmentResponse(project, apartment);
	}

	/** Full replacement of the configuration's fields. */
	@Transactional
	public ApartmentResponse update(Long propertyId, Long apartmentId, CurrentActor actor, ApartmentRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		PropertyApartment apartment = access.requireApartment(project, apartmentId);
		if (request.id() != null && !request.id().equals(apartmentId)) {
			throw new FieldValidationException("id", "must match the apartment in the URL");
		}
		applyFields(apartment, request, "");
		if (request.displayOrder() != null) {
			apartment.setDisplayOrder(request.displayOrder());
		}
		apartmentRepository.saveAndFlush(apartment);
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toApartmentResponse(project, apartment);
	}

	@Transactional
	public void delete(Long propertyId, Long apartmentId, CurrentActor actor, Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		apartmentRepository.delete(access.requireApartment(project, apartmentId));
		apartmentRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
	}

	/**
	 * Saves the complete set atomically: listed ids are updated, items without an id are created, and
	 * configurations not listed are soft-deleted. Ids must belong to this property.
	 */
	@Transactional
	public List<ApartmentResponse> sync(Long propertyId, CurrentActor actor, SyncApartmentsRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		Map<Long, PropertyApartment> existing = apartmentRepository
			.findByPropertyProjectIdOrderByDisplayOrderAscIdAsc(project.getId()).stream()
			.collect(Collectors.toMap(PropertyApartment::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
		Set<Long> kept = new HashSet<>();
		List<PropertyApartment> saved = new ArrayList<>();
		for (int i = 0; i < request.apartments().size(); i++) {
			ApartmentRequest item = request.apartments().get(i);
			String prefix = "apartments[" + i + "].";
			PropertyApartment apartment;
			if (item.id() == null) {
				apartment = newApartment(project, item, prefix);
			}
			else {
				apartment = existing.get(item.id());
				if (apartment == null) {
					throw new FieldValidationException(prefix + "id", "is not a configuration of this property");
				}
				if (!kept.add(item.id())) {
					throw new FieldValidationException(prefix + "id", "is listed more than once");
				}
				applyFields(apartment, item, prefix);
			}
			apartment.setDisplayOrder(i);
			saved.add(apartment);
		}
		apartmentRepository.deleteAll(existing.values().stream().filter(a -> !kept.contains(a.getId())).toList());
		apartmentRepository.saveAll(saved);
		apartmentRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toApartmentResponses(project);
	}

	private static PropertyApartment newApartment(PropertyProject project, ApartmentRequest request, String prefix) {
		PropertyApartment apartment = new PropertyApartment(project.getId(), request.apartmentName().strip(),
				ApartmentType.fromValue(request.apartmentType()), request.startingPrice(),
				request.bedrooms().shortValue(), request.bathrooms().shortValue());
		applyFields(apartment, request, prefix);
		return apartment;
	}

	/** Every field from the request; omitted optional fields are cleared or reset to their defaults. */
	private static void applyFields(PropertyApartment apartment, ApartmentRequest request, String prefix) {
		if (request.areaMax().compareTo(request.areaMin()) < 0) {
			throw new FieldValidationException(prefix + "areaMax", "must not be less than areaMin");
		}
		apartment.setApartmentName(request.apartmentName().strip());
		apartment.setApartmentType(ApartmentType.fromValue(request.apartmentType()));
		apartment.setStartingPrice(request.startingPrice());
		apartment.setCurrency(request.currency() == null ? "INR" : request.currency());
		apartment.setDescription(request.description() == null || request.description().isBlank() ? null
				: request.description().strip());
		apartment.setBedrooms(request.bedrooms().shortValue());
		apartment.setBathrooms(request.bathrooms().shortValue());
		apartment.setBalconies(request.balconies() == null ? 0 : request.balconies().shortValue());
		apartment.setCarParking(request.carParking() == null ? 0 : request.carParking().shortValue());
		apartment.setAreaMin(request.areaMin());
		apartment.setAreaMax(request.areaMax());
		apartment.setCarpetArea(request.carpetArea());
		apartment.setBalconyArea(request.balconyArea());
		apartment.setBuiltUpArea(request.builtUpArea());
		apartment.setSuperBuiltUpArea(request.superBuiltUpArea());
		apartment.setAreaUnit(request.areaUnit() == null ? AreaUnit.SQ_FT : AreaUnit.fromValue(request.areaUnit()));
		apartment.setHighlights(request.highlights() == null ? null
				: new ArrayList<>(request.highlights().stream().map(String::strip).toList()));
	}

}
