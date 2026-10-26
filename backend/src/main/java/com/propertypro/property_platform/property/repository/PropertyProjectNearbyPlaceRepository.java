package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyProjectNearbyPlace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyProjectNearbyPlaceRepository extends JpaRepository<PropertyProjectNearbyPlace, Long> {

	List<PropertyProjectNearbyPlace> findByPropertyProjectIdOrderByDistanceKmAscIdAsc(Long propertyProjectId);

}
