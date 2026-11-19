package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Starting price, configuration types and cover photo for a page of admin list items, with two batch
 * queries per page (never one per property). Call inside the list's read transaction.
 */
@Component
@RequiredArgsConstructor
class PropertyListExtras {

	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyProjectMediaRepository projectMediaRepository;
	private final PropertyResponseMapper mapper;

	Function<PropertyProjectSummary, PropertySummaryResponse> adminSummaries(List<PropertyProjectSummary> projects) {
		if (projects.isEmpty()) {
			return p -> PropertySummaryResponse.forAdmin(p, null, List.of(), null);
		}
		List<Long> ids = projects.stream().map(PropertyProjectSummary::getId).toList();
		Map<Long, List<PropertyApartment>> apartments = apartmentRepository
			.findByPropertyProjectIdInOrderByDisplayOrderAscIdAsc(ids).stream()
			.collect(Collectors.groupingBy(PropertyApartment::getPropertyProjectId));
		Map<Long, List<PropertyProjectMedia>> photos = projectMediaRepository
			.findByPropertyProjectIdInAndMediaTypeOrderBySortOrderAscIdAsc(ids, ProjectMediaType.PHOTO).stream()
			.collect(Collectors.groupingBy(PropertyProjectMedia::getPropertyProjectId));
		return p -> {
			List<PropertyApartment> configurations = apartments.getOrDefault(p.getId(), List.of());
			BigDecimal startingPrice = configurations.stream().map(PropertyApartment::getStartingPrice)
				.filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
			List<ApartmentType> types = configurations.stream().map(PropertyApartment::getApartmentType).distinct()
				.toList();
			List<PropertyProjectMedia> projectPhotos = photos.getOrDefault(p.getId(), List.of());
			String coverUrl = projectPhotos.stream().filter(PropertyProjectMedia::isPrimary).findFirst()
				.or(() -> projectPhotos.stream().findFirst())
				.map(m -> mapper.toAdminMediaUrl(p.getId(), m)).orElse(null);
			return PropertySummaryResponse.forAdmin(p, startingPrice, types, coverUrl);
		};
	}

}
