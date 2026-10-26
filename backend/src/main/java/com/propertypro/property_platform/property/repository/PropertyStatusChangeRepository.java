package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyStatusChange;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyStatusChangeRepository extends JpaRepository<PropertyStatusChange, Long> {

	List<PropertyStatusChange> findByPropertyProjectIdOrderByCreatedAtAscIdAsc(Long propertyProjectId);

}
