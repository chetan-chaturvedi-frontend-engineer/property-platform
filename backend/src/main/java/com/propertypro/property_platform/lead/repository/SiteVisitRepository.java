package com.propertypro.property_platform.lead.repository;

import com.propertypro.property_platform.lead.domain.SiteVisit;
import com.propertypro.property_platform.lead.domain.SiteVisitStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.Optional;

/** Derived and JPQL queries exclude soft-deleted visits. */
public interface SiteVisitRepository extends JpaRepository<SiteVisit, Long>, JpaSpecificationExecutor<SiteVisit> {

	/** The visit, row-locked until the transaction ends, so changes to one visit run one after another. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select v from SiteVisit v where v.id = :id")
	Optional<SiteVisit> findByIdForUpdate(Long id);

	/** Another booking of the same visitor for the same slot; backed by {@code uq_site_visits_active_booking}. */
	boolean existsByUserIdAndPropertyIdAndVisitDateAndVisitTimeAndStatusInAndIdNot(Long userId, Long propertyId,
			LocalDate visitDate, LocalTime visitTime, Collection<SiteVisitStatus> statuses, Long id);

}
