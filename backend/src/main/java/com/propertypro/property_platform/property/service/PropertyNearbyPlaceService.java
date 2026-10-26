package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.property.domain.NearbyPlaceType;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectNearbyPlace;
import com.propertypro.property_platform.property.dto.NearbyPlaceRequest;
import com.propertypro.property_platform.property.dto.NearbyPlaceResponse;
import com.propertypro.property_platform.property.dto.SyncNearbyPlacesRequest;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyProjectNearbyPlaceRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Places near a property, shared by all its apartment configurations. Distances are stored as
 * entered and marked {@code manual}: no mapping service verifies them.
 */
@Service
@RequiredArgsConstructor
public class PropertyNearbyPlaceService {

	private final PropertyProjectNearbyPlaceRepository nearbyPlaceRepository;
	private final PropertyAccessService access;
	private final PropertyWizardService wizard;
	private final PropertyResponseMapper mapper;

	@Transactional(readOnly = true)
	public List<NearbyPlaceResponse> list(Long propertyId, CurrentActor actor) {
		return mapper.toNearbyPlaceResponses(access.requireViewable(propertyId, actor));
	}

	/** Replaces the whole list in one transaction. */
	@Transactional
	public List<NearbyPlaceResponse> sync(Long propertyId, CurrentActor actor, SyncNearbyPlacesRequest request,
			Long expectedVersion) {
		PropertyProject project = access.requireEditable(propertyId, actor, expectedVersion);
		List<PropertyProjectNearbyPlace> places = new ArrayList<>();
		for (int i = 0; i < request.places().size(); i++) {
			NearbyPlaceRequest item = request.places().get(i);
			if ((item.latitude() == null) != (item.longitude() == null)) {
				throw new FieldValidationException("places[" + i + "]." + (item.latitude() == null ? "latitude" : "longitude"),
						"latitude and longitude must be provided together");
			}
			PropertyProjectNearbyPlace place = new PropertyProjectNearbyPlace(project.getId(), item.placeName().strip(),
					NearbyPlaceType.fromValue(item.placeType()), item.distanceKm());
			place.setLocation(item.latitude(), item.longitude());
			places.add(place);
		}
		nearbyPlaceRepository.deleteAll(nearbyPlaceRepository.findByPropertyProjectIdOrderByDistanceKmAscIdAsc(project.getId()));
		nearbyPlaceRepository.flush();
		nearbyPlaceRepository.saveAll(places);
		nearbyPlaceRepository.flush();
		wizard.afterChange(project, actor, access.actsWithUpdateAny(actor));
		return mapper.toNearbyPlaceResponses(project);
	}

}
