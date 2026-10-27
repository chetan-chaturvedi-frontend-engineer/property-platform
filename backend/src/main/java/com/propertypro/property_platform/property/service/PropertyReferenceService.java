package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.dto.PropertyReference;
import com.propertypro.property_platform.property.repository.PropertyProjectSummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read access to properties for other modules, which must not use the property repositories. No
 * authorization happens here: callers decide who may use which property.
 */
@Service
@RequiredArgsConstructor
public class PropertyReferenceService {

	private final PropertyProjectSummaryRepository summaryRepository;

	/** Empty for unknown and soft-deleted properties. */
	@Transactional(readOnly = true)
	public Optional<PropertyReference> findActive(Long propertyId) {
		return summaryRepository.findById(propertyId).filter(project -> project.getDeletedAt() == null)
			.map(PropertyReferenceService::toReference);
	}

	/** By id, soft-deleted properties included; unknown ids are missing from the map. */
	@Transactional(readOnly = true)
	public Map<Long, PropertyReference> findAll(Collection<Long> propertyIds) {
		if (propertyIds.isEmpty()) {
			return Map.of();
		}
		return summaryRepository.findAllByIdIn(propertyIds).stream()
			.map(PropertyReferenceService::toReference)
			.collect(Collectors.toMap(PropertyReference::id, Function.identity()));
	}

	private static PropertyReference toReference(PropertyProjectSummary project) {
		return new PropertyReference(project.getId(), project.getUserId(), project.getProjectName(),
				project.getSlug(), project.getCity(), project.getLocality(), project.getPublicationStatus(),
				project.getDeletedAt() != null);
	}

}
