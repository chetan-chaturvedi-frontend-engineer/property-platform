package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyStatusChange;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface PropertyStatusChangeRepository extends JpaRepository<PropertyStatusChange, Long> {

	List<PropertyStatusChange> findByPropertyProjectIdOrderByCreatedAtAscIdAsc(Long propertyProjectId);

	/** Every project's changes, newest first (the admin activity feed). */
	Page<PropertyStatusChange> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

	/** The latest change with this action per project, for a page of list items: one grouped query. */
	@Query("""
			select c.propertyProjectId as projectId, max(c.createdAt) as createdAt from PropertyStatusChange c
			where c.propertyProjectId in :projectIds and c.action = :action group by c.propertyProjectId""")
	List<LatestChange> findLatestByAction(Collection<Long> projectIds, StatusChangeAction action);

	/** Distinct projects with this action since the given instant (dashboard counters). */
	@Query("""
			select count(distinct c.propertyProjectId) from PropertyStatusChange c
			where c.action = :action and c.createdAt >= :since""")
	long countProjectsWithActionSince(StatusChangeAction action, Instant since);

	interface LatestChange {

		Long getProjectId();

		Instant getCreatedAt();

	}

}
