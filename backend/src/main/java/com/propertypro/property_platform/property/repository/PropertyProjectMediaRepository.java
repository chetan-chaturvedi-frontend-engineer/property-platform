package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.ProjectMediaType;
import com.propertypro.property_platform.property.domain.PropertyProjectMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PropertyProjectMediaRepository extends JpaRepository<PropertyProjectMedia, Long> {

	List<PropertyProjectMedia> findByPropertyProjectIdOrderBySortOrderAscIdAsc(Long propertyProjectId);

	/** Batch lookup of a media type for list views (cover photos). */
	List<PropertyProjectMedia> findByPropertyProjectIdInAndMediaTypeOrderBySortOrderAscIdAsc(
			Collection<Long> propertyProjectIds, ProjectMediaType mediaType);

	/** Scoped to the parent, so a media id of another property is never found. */
	Optional<PropertyProjectMedia> findByIdAndPropertyProjectId(Long id, Long propertyProjectId);

	/** Media files (every type) per project for list views: one grouped query for a page. */
	@Query("""
			select m.propertyProjectId as projectId, count(m) as total from PropertyProjectMedia m
			where m.propertyProjectId in :projectIds group by m.propertyProjectId""")
	List<ProjectCount> countByProjectIds(Collection<Long> projectIds);

	interface ProjectCount {

		Long getProjectId();

		long getTotal();

	}

	long countByPropertyProjectIdAndMediaType(Long propertyProjectId, ProjectMediaType mediaType);

	Optional<PropertyProjectMedia> findFirstByPropertyProjectIdAndPrimaryTrue(Long propertyProjectId);

	Optional<PropertyProjectMedia> findFirstByPropertyProjectIdAndMediaTypeOrderBySortOrderAscIdAsc(
			Long propertyProjectId, ProjectMediaType mediaType);

	@Query("select coalesce(max(m.sortOrder), -1) from PropertyProjectMedia m where m.propertyProjectId = :projectId")
	int maxSortOrder(Long projectId);

}
