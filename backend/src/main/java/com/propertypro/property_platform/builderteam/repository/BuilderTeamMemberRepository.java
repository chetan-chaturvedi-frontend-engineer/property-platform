package com.propertypro.property_platform.builderteam.repository;

import com.propertypro.property_platform.builderteam.domain.BuilderTeamMember;
import com.propertypro.property_platform.builderteam.domain.BuilderTeamStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.Optional;

/** Derived and JPQL queries exclude soft-deleted memberships. */
public interface BuilderTeamMemberRepository
		extends JpaRepository<BuilderTeamMember, Long>, JpaSpecificationExecutor<BuilderTeamMember> {

	/** The membership, row-locked until the transaction ends, so changes to one membership run one after another. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select m from BuilderTeamMember m where m.id = :id")
	Optional<BuilderTeamMember> findByIdForUpdate(Long id);

	/** An open membership of the employee in the builder's team; backed by {@code uq_builder_teams_open_membership}. */
	boolean existsByBuilderIdAndEmployeeIdAndStatusIn(Long builderId, Long employeeId,
			Collection<BuilderTeamStatus> statuses);

	/** Seats in use: pending and active members. */
	long countByBuilderIdAndStatusIn(Long builderId, Collection<BuilderTeamStatus> statuses);

}
