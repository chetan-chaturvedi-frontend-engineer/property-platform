package com.propertypro.property_platform.cms.faq.repository;

import com.propertypro.property_platform.cms.faq.domain.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FaqRepository extends JpaRepository<Faq, Long>, JpaSpecificationExecutor<Faq> {

	/** Hard delete in one statement; 0 when the FAQ does not exist (also when deleted concurrently). */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("DELETE FROM Faq f WHERE f.id = :id")
	int deleteFaqById(@Param("id") Long id);

}
