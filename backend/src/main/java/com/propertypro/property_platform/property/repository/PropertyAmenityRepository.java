package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyAmenity;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PropertyAmenityRepository extends JpaRepository<PropertyAmenity, Long> {

	Optional<PropertyAmenity> findBySlug(String slug);

	List<PropertyAmenity> findByActiveTrue(Sort sort);

	/** Owners may only link active amenities. */
	List<PropertyAmenity> findByIdInAndActiveTrue(Collection<Long> ids);

	@Query("""
			select a from PropertyAmenity a join PropertyProjectAmenity l on l.id.propertyAmenityId = a.id
			where l.id.propertyProjectId = :projectId order by a.name""")
	List<PropertyAmenity> findLinkedToProject(Long projectId);

	@Query("""
			select a from PropertyAmenity a join PropertyApartmentAmenity l on l.id.propertyAmenityId = a.id
			where l.id.propertyApartmentId = :apartmentId order by a.name""")
	List<PropertyAmenity> findLinkedToApartment(Long apartmentId);

	/** Amenities of several apartment configurations in one query (detail views). */
	@Query("""
			select new com.propertypro.property_platform.property.repository.ApartmentAmenityRow(l.id.propertyApartmentId, a)
			from PropertyApartmentAmenity l join PropertyAmenity a on l.id.propertyAmenityId = a.id
			where l.id.propertyApartmentId in :apartmentIds order by a.name""")
	List<ApartmentAmenityRow> findLinkedToApartments(Collection<Long> apartmentIds);

}
