package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Includes soft-deleted projects: callers must filter on {@code deletedAt}. */
public interface PropertyProjectSummaryRepository
		extends Repository<PropertyProjectSummary, Long>, JpaSpecificationExecutor<PropertyProjectSummary> {

	Optional<PropertyProjectSummary> findById(Long id);

}
