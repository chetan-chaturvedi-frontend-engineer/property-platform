package com.propertypro.property_platform.savedproperty.repository;

import com.propertypro.property_platform.savedproperty.domain.SavedProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

/** Every lookup is by the owner's user id; a shortlist entry is never loaded by its own id. */
public interface SavedPropertyRepository extends JpaRepository<SavedProperty, Long> {

	Page<SavedProperty> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

	boolean existsByUserIdAndPropertyId(Long userId, Long propertyId);

	/** Property ids on the user's shortlist, newest first; lets the app show a filled heart without loading them. */
	@Query("select s.propertyId from SavedProperty s where s.userId = :userId order by s.createdAt desc, s.id desc")
	List<Long> findPropertyIdsByUserId(Long userId, Pageable pageable);

	@Modifying
	@Query("delete from SavedProperty s where s.userId = :userId and s.propertyId = :propertyId")
	int deleteByUserIdAndPropertyId(Long userId, Long propertyId);

	@Query("select count(s) from SavedProperty s where s.propertyId in :propertyIds")
	long countByPropertyIdIn(Collection<Long> propertyIds);

}
