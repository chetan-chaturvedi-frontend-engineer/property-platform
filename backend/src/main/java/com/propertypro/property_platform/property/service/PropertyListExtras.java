package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse.AdminExtras;
import com.propertypro.property_platform.property.dto.PropertySummaryResponse;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyStatusChangeRepository;
import com.propertypro.property_platform.user.dto.UserSummary;
import com.propertypro.property_platform.user.service.UserAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.IntSummaryStatistics;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Display extras (price, configuration types, area, parking, cover photo, media count, submission time and
 * owner name) for a page of admin list items, with one batch query each per page (never one per property).
 * Call inside the list's read transaction.
 */
@Component
@RequiredArgsConstructor
class PropertyListExtras {

	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyProjectMediaRepository projectMediaRepository;
	private final PropertyStatusChangeRepository statusChangeRepository;
	private final UserAccountService userAccountService;
	private final PropertyResponseMapper mapper;

	Function<PropertyProjectSummary, PropertySummaryResponse> adminSummaries(List<PropertyProjectSummary> projects) {
		if (projects.isEmpty()) {
			return p -> PropertySummaryResponse.forAdmin(p, AdminExtras.NONE);
		}
		List<Long> ids = projects.stream().map(PropertyProjectSummary::getId).toList();
		Map<Long, List<PropertyApartment>> apartments = apartmentRepository
			.findByPropertyProjectIdInOrderByDisplayOrderAscIdAsc(ids).stream()
			.collect(Collectors.groupingBy(PropertyApartment::getPropertyProjectId));
		Map<Long, List<PropertyProjectMedia>> photos = projectMediaRepository
			.findByPropertyProjectIdInAndMediaTypeOrderBySortOrderAscIdAsc(ids, ProjectMediaType.PHOTO).stream()
			.collect(Collectors.groupingBy(PropertyProjectMedia::getPropertyProjectId));
		Map<Long, Long> mediaCounts = projectMediaRepository.countByProjectIds(ids).stream()
			.collect(Collectors.toMap(PropertyProjectMediaRepository.ProjectCount::getProjectId,
					PropertyProjectMediaRepository.ProjectCount::getTotal));
		Map<Long, Instant> submitted = statusChangeRepository.findLatestByAction(ids, StatusChangeAction.SUBMITTED)
			.stream()
			.collect(Collectors.toMap(PropertyStatusChangeRepository.LatestChange::getProjectId,
					PropertyStatusChangeRepository.LatestChange::getCreatedAt));
		// Owners and linked builders in one lookup.
		Map<Long, UserSummary> owners = userAccountService.findSummaries(projects.stream()
			.flatMap(p -> Stream.of(p.getUserId(), p.getBuilderUserId()))
			.filter(Objects::nonNull).distinct().toList());

		return p -> {
			List<PropertyApartment> configurations = apartments.getOrDefault(p.getId(), List.of());
			// Price and area come from the same configuration, so price per area is a like-for-like figure.
			Optional<PropertyApartment> cheapest = configurations.stream()
				.filter(a -> a.getStartingPrice() != null)
				.min(Comparator.comparing(PropertyApartment::getStartingPrice));
			BigDecimal startingPrice = cheapest.map(PropertyApartment::getStartingPrice).orElse(null);
			BigDecimal startingArea = cheapest.map(PropertyApartment::getAreaMin).orElse(null);
			List<ApartmentType> types = configurations.stream().map(PropertyApartment::getApartmentType).distinct()
				.toList();
			IntSummaryStatistics parking = configurations.stream().mapToInt(PropertyApartment::getCarParking)
				.summaryStatistics();
			boolean hasConfigurations = !configurations.isEmpty();
			List<PropertyProjectMedia> projectPhotos = photos.getOrDefault(p.getId(), List.of());
			String coverUrl = projectPhotos.stream().filter(PropertyProjectMedia::isPrimary).findFirst()
				.or(() -> projectPhotos.stream().findFirst())
				.map(m -> mapper.toAdminMediaUrl(p.getId(), m)).orElse(null);
			UserSummary owner = owners.get(p.getUserId());
			return PropertySummaryResponse.forAdmin(p, new AdminExtras(startingPrice, types, coverUrl,
					owner == null ? null : owner.fullName(), mediaCounts.getOrDefault(p.getId(), 0L),
					startingArea, startingArea == null ? null : cheapest.get().getAreaUnit(),
					hasConfigurations ? parking.getMin() : null, hasConfigurations ? parking.getMax() : null,
					submitted.get(p.getId()),
					p.getBuilderUserId() == null ? null : owners.get(p.getBuilderUserId())));
		};
	}

}
