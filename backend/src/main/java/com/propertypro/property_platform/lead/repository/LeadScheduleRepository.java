package com.propertypro.property_platform.lead.repository;

import com.propertypro.property_platform.lead.domain.LeadSchedule;
import com.propertypro.property_platform.lead.domain.ScheduleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Derived queries exclude soft-deleted schedules; callers check the lead is visible first. */
public interface LeadScheduleRepository extends JpaRepository<LeadSchedule, Long> {

	Page<LeadSchedule> findByLeadId(Long leadId, Pageable pageable);

	Page<LeadSchedule> findByLeadIdAndStatus(Long leadId, ScheduleStatus status, Pageable pageable);

	/** Scoped to the lead, so a schedule id of another lead is not found. */
	Optional<LeadSchedule> findByIdAndLeadId(Long id, Long leadId);

}
