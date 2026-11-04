package com.propertypro.property_platform.activitylog.repository;

import com.propertypro.property_platform.activitylog.domain.SystemLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/**
 * Insert and read only: extends the bare {@link Repository} so no update or delete method exists. The
 * specification query is declared here because {@code JpaSpecificationExecutor} would add a delete.
 */
public interface SystemLogRepository extends Repository<SystemLog, Long> {

	SystemLog save(SystemLog log);

	Optional<SystemLog> findById(Long id);

	Page<SystemLog> findAll(Specification<SystemLog> specification, Pageable pageable);

}
