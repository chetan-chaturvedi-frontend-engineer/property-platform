package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyApartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/** Derived queries exclude soft-deleted apartment configurations. */
public interface PropertyApartmentRepository extends JpaRepository<PropertyApartment, Long> {

	List<PropertyApartment> findByPropertyProjectIdOrderByDisplayOrderAscIdAsc(Long propertyProjectId);

	/** Scoped to the parent, so an apartment id of another property is never found. */
	Optional<PropertyApartment> findByIdAndPropertyProjectId(Long id, Long propertyProjectId);

	long countByPropertyProjectId(Long propertyProjectId);

	/** Configurations without the advertised area range, which submission requires. */
	@Query("""
			select count(a) from PropertyApartment a
			where a.propertyProjectId = :projectId and (a.areaMin is null or a.areaMax is null)""")
	long countMissingAreaRange(Long projectId);

	@Query("select coalesce(max(a.displayOrder), -1) from PropertyApartment a where a.propertyProjectId = :projectId")
	int maxDisplayOrder(Long projectId);

}
