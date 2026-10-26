package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.ApartmentMediaType;
import com.propertypro.property_platform.property.domain.PropertyApartmentMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PropertyApartmentMediaRepository extends JpaRepository<PropertyApartmentMedia, Long> {

	List<PropertyApartmentMedia> findByPropertyApartmentIdOrderBySortOrderAscIdAsc(Long propertyApartmentId);

	/** Media of several apartments in one query (detail views). */
	List<PropertyApartmentMedia> findByPropertyApartmentIdInOrderBySortOrderAscIdAsc(Collection<Long> apartmentIds);

	/** Scoped to the parent, so a media id of another apartment is never found. */
	Optional<PropertyApartmentMedia> findByIdAndPropertyApartmentId(Long id, Long propertyApartmentId);

	long countByPropertyApartmentIdAndMediaType(Long propertyApartmentId, ApartmentMediaType mediaType);

	Optional<PropertyApartmentMedia> findFirstByPropertyApartmentIdAndPrimaryTrue(Long propertyApartmentId);

	@Query("select coalesce(max(m.sortOrder), -1) from PropertyApartmentMedia m where m.propertyApartmentId = :apartmentId")
	int maxSortOrder(Long apartmentId);

}
