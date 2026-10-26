package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyProjectAmenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PropertyProjectAmenityRepository
		extends JpaRepository<PropertyProjectAmenity, PropertyProjectAmenity.Id> {

	List<PropertyProjectAmenity> findByIdPropertyProjectId(Long propertyProjectId);

	long countByIdPropertyProjectId(Long propertyProjectId);

	@Modifying(flushAutomatically = true)
	@Query("delete from PropertyProjectAmenity l where l.id.propertyProjectId = :parentId")
	int deleteByParentId(Long parentId);

}
