package com.propertypro.property_platform.property.repository;

import com.propertypro.property_platform.property.domain.PropertyProjectSummary;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Includes soft-deleted projects: callers must filter on {@code deletedAt}. */
public interface PropertyProjectSummaryRepository
		extends Repository<PropertyProjectSummary, Long>, JpaSpecificationExecutor<PropertyProjectSummary> {

	Optional<PropertyProjectSummary> findById(Long id);

	List<PropertyProjectSummary> findAllByIdIn(Collection<Long> ids);

	/** Ids of a user's own properties that are not deleted (every publication status). */
	@Query("select p.id from PropertyProjectSummary p where p.userId = :userId and p.deletedAt is null")
	List<Long> findIdsByOwner(Long userId);

	/** Property counts per publication and legal status, deleted ones in their own rows: one aggregate query. */
	@Query(value = """
			SELECT publication_status AS publicationStatus, legal_approval_status AS legalApprovalStatus,
			       deleted_at IS NOT NULL AS deleted, count(*) AS total
			FROM property_projects
			GROUP BY publication_status, legal_approval_status, deleted_at IS NOT NULL""", nativeQuery = true)
	List<StatusCount> countByStatus();

	interface StatusCount {

		String getPublicationStatus();

		String getLegalApprovalStatus();

		boolean isDeleted();

		long getTotal();

	}

}
