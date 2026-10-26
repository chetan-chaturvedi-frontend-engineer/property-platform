package com.propertypro.property_platform.lead.repository;

import com.propertypro.property_platform.lead.domain.InteractionType;
import com.propertypro.property_platform.lead.domain.LeadInteraction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

/** Derived and JPQL queries exclude soft-deleted interactions; callers check the lead is visible first. */
public interface LeadInteractionRepository extends JpaRepository<LeadInteraction, Long> {

	Page<LeadInteraction> findByLeadId(Long leadId, Pageable pageable);

	Page<LeadInteraction> findByLeadIdAndType(Long leadId, InteractionType type, Pageable pageable);

	/** Scoped to the lead, so an interaction id of another lead is not found. */
	Optional<LeadInteraction> findByIdAndLeadId(Long id, Long leadId);

	/** The latest {@code interactionAt} of the lead's interactions other than {@code excluded}. */
	@Query("select max(i.interactionAt) from LeadInteraction i where i.leadId = :leadId and i.type <> :excluded")
	Optional<Instant> findLatestInteractionAtExcluding(Long leadId, InteractionType excluded);

}
