package com.propertypro.property_platform.lead.repository;

import com.propertypro.property_platform.lead.domain.Lead;
import com.propertypro.property_platform.lead.domain.LeadSource;
import com.propertypro.property_platform.lead.domain.LeadStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/** Derived and JPQL queries exclude soft-deleted leads. */
public interface LeadRepository extends JpaRepository<Lead, Long>, JpaSpecificationExecutor<Lead> {

	/** Earlier enquiries from the same customer. */
	List<Lead> findTop10ByPhoneOrderByCreatedAtDesc(String phone);

	/** The lead, row-locked until the transaction ends, so changes to one lead run one after another. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select l from Lead l where l.id = :id")
	Optional<Lead> findByIdForUpdate(Long id);

	/** Non-deleted leads per status and source, for the admin dashboard counts. */
	@Query("select l.status as status, l.source as source, count(l) as total from Lead l group by l.status, l.source")
	List<StatusSourceCount> countByStatusAndSource();

	interface StatusSourceCount {

		LeadStatus getStatus();

		LeadSource getSource();

		long getTotal();

	}

}
