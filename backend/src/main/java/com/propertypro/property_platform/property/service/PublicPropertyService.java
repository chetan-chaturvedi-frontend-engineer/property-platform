package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.property.domain.ApartmentType;
import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.ProjectStatus;
import com.propertypro.property_platform.property.domain.PropertyApartment;
import com.propertypro.property_platform.property.domain.PropertyProject;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import com.propertypro.property_platform.property.domain.PropertyType;
import com.propertypro.property_platform.property.domain.PublicationStatus;
import com.propertypro.property_platform.property.dto.PublicPropertyFilter;
import com.propertypro.property_platform.property.dto.PublicPropertyResponse;
import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.mapper.PropertyResponseMapper;
import com.propertypro.property_platform.property.repository.PropertyApartmentRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectMediaRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.property.repository.PropertyProjectSummaryRepository;
import com.propertypro.property_platform.property.service.PropertyMediaService.MediaContent;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Read-only access for the public website and app: published, non-deleted properties only. */
@Service
@RequiredArgsConstructor
public class PublicPropertyService {

	static final List<String> SORTABLE_FIELDS = List.of("publishedAt", "projectName", "city");

	private final PropertyProjectSummaryRepository summaryRepository;
	private final PropertyProjectRepository projectRepository;
	private final PropertyApartmentRepository apartmentRepository;
	private final PropertyProjectMediaRepository projectMediaRepository;
	private final PropertyResponseMapper mapper;
	private final PropertyMediaService mediaService;

	@Transactional(readOnly = true)
	public PageResponse<PublicPropertySummaryResponse> list(PublicPropertyFilter filter, Pageable pageable) {
		if (filter.minPrice() != null && filter.maxPrice() != null && filter.maxPrice().compareTo(filter.minPrice()) < 0) {
			throw new FieldValidationException("maxPrice", "must not be less than minPrice");
		}
		for (Sort.Order order : pageable.getSort()) {
			if (!SORTABLE_FIELDS.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE_FIELDS));
			}
		}
		PageRequest page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
		Page<PropertyProjectSummary> found = summaryRepository.findAll(matching(filter), page);
		return PageResponse.of(found, toSummaries(found.getContent()));
	}

	/** Adds price, configuration types and cover photo to a page of results with two batch queries. */
	private Function<PropertyProjectSummary, PublicPropertySummaryResponse> toSummaries(
			List<PropertyProjectSummary> projects) {
		if (projects.isEmpty()) {
			return p -> PublicPropertySummaryResponse.from(p, null, List.of(), null);
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
				.map(m -> mapper.toPublicMediaUrl(p.getSlug(), m)).orElse(null);
			return PublicPropertySummaryResponse.from(p, startingPrice, types, coverUrl);
		};
	}

	/** 404 unless the property is published and not deleted: only those can be saved or counted as viewed. */
	@Transactional(readOnly = true)
	public void requirePublished(Long id) {
		summaryRepository.findById(id).filter(PublicPropertyService::isPublic).orElseThrow(PropertyExceptions::notFound);
	}

	/** Published, non-deleted properties among {@code ids}, in the order of {@code ids}; any other id is skipped. */
	@Transactional(readOnly = true)
	public List<PublicPropertySummaryResponse> summariesByIds(List<Long> ids) {
		if (ids.isEmpty()) {
			return List.of();
		}
		Map<Long, PropertyProjectSummary> byId = summaryRepository.findAllByIdIn(ids).stream()
			.filter(PublicPropertyService::isPublic).collect(Collectors.toMap(PropertyProjectSummary::getId, p -> p));
		List<PropertyProjectSummary> ordered = ids.stream().map(byId::get).filter(Objects::nonNull).toList();
		return ordered.stream().map(toSummaries(ordered)).toList();
	}

	private static boolean isPublic(PropertyProjectSummary p) {
		return p.getDeletedAt() == null && p.getPublicationStatus() == PublicationStatus.PUBLISHED;
	}

	@Transactional(readOnly = true)
	public PublicPropertyResponse get(String slug) {
		return mapper.toPublicResponse(published(slug));
	}

	@Transactional(readOnly = true)
	public MediaContent projectMediaContent(String slug, Long mediaId) {
		return mediaService.publicProjectMediaContent(published(slug), mediaId);
	}

	@Transactional(readOnly = true)
	public MediaContent apartmentMediaContent(String slug, Long apartmentId, Long mediaId) {
		return mediaService.publicApartmentMediaContent(published(slug), apartmentId, mediaId);
	}

	/** Unpublished and deleted properties are reported as not found. */
	private PropertyProject published(String slug) {
		return projectRepository.findBySlug(slug)
			.filter(p -> p.getPublicationStatus() == PublicationStatus.PUBLISHED)
			.orElseThrow(PropertyExceptions::notFound);
	}

	private static Specification<PropertyProjectSummary> matching(PublicPropertyFilter filter) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.isNull(root.get("deletedAt")));
			predicates.add(cb.equal(root.get("publicationStatus"), PublicationStatus.PUBLISHED));
			if (filter.search() != null && !filter.search().isBlank()) {
				String pattern = "%" + PropertyService.escapeLike(filter.search().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("projectName")), pattern, '\\'),
						cb.like(cb.lower(root.get("builderCompanyName")), pattern, '\\')));
			}
			equalsIgnoreCase(predicates, cb, root.get("city"), filter.city());
			equalsIgnoreCase(predicates, cb, root.get("state"), filter.state());
			equalsIgnoreCase(predicates, cb, root.get("locality"), filter.locality());
			if (filter.propertyType() != null) {
				predicates.add(cb.equal(root.get("propertyType"), PropertyType.fromValue(filter.propertyType())));
			}
			if (filter.projectStatus() != null) {
				predicates.add(cb.equal(root.get("projectStatus"), ProjectStatus.fromValue(filter.projectStatus())));
			}
			if (filter.apartmentType() != null || filter.minPrice() != null || filter.maxPrice() != null) {
				// At least one (non-deleted) configuration matching type and price.
				Subquery<Long> matchingApartment = query.subquery(Long.class);
				Root<PropertyApartment> apartment = matchingApartment.from(PropertyApartment.class);
				List<Predicate> conditions = new ArrayList<>();
				conditions.add(cb.equal(apartment.get("propertyProjectId"), root.get("id")));
				if (filter.apartmentType() != null) {
					conditions.add(cb.equal(apartment.get("apartmentType"), ApartmentType.fromValue(filter.apartmentType())));
				}
				if (filter.minPrice() != null) {
					conditions.add(cb.greaterThanOrEqualTo(apartment.<BigDecimal>get("startingPrice"), filter.minPrice()));
				}
				if (filter.maxPrice() != null) {
					conditions.add(cb.lessThanOrEqualTo(apartment.<BigDecimal>get("startingPrice"), filter.maxPrice()));
				}
				matchingApartment.select(apartment.get("id")).where(conditions.toArray(Predicate[]::new));
				predicates.add(cb.exists(matchingApartment));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static void equalsIgnoreCase(List<Predicate> predicates, CriteriaBuilder cb, Path<String> path,
			String value) {
		if (value != null && !value.isBlank()) {
			predicates.add(cb.equal(cb.lower(path), value.strip().toLowerCase(Locale.ROOT)));
		}
	}

}
