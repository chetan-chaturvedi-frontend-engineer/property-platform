package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyApartmentAmenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PropertyApartmentAmenityRepository
		extends JpaRepository<PropertyApartmentAmenity, PropertyApartmentAmenity.Id> {

	List<PropertyApartmentAmenity> findByIdPropertyApartmentId(Long propertyApartmentId);

	@Modifying(flushAutomatically = true)
	@Query("delete from PropertyApartmentAmenity l where l.id.propertyApartmentId = :parentId")
	int deleteByParentId(Long parentId);

}
