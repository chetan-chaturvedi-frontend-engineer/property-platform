package com.propertypro.property_platform.propertyview.repository;

import com.propertypro.property_platform.propertyview.domain.PropertyView;
import com.propertypro.property_platform.propertyview.dto.PropertyViewTotals;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

/** Every user-facing lookup is by the owner's user id. */
public interface PropertyViewRepository extends JpaRepository<PropertyView, Long> {

	/** First view inserts a row, every later one counts up and moves the last viewed time: one row per pair. */
	@Modifying
	@Query(value = """
			INSERT INTO property_views (user_id, property_id) VALUES (:userId, :propertyId)
			ON CONFLICT (user_id, property_id)
			DO UPDATE SET view_count = property_views.view_count + 1, last_viewed_at = now()""", nativeQuery = true)
	void recordView(Long userId, Long propertyId);

	@Query("select v.propertyId from PropertyView v where v.userId = :userId order by v.lastViewedAt desc, v.id desc")
	List<Long> findPropertyIdsByUserId(Long userId, Pageable pageable);

	@Modifying
	@Query("delete from PropertyView v where v.userId = :userId")
	int deleteByUserId(Long userId);

	@Query("""
			select new com.propertypro.property_platform.propertyview.dto.PropertyViewTotals(
				coalesce(sum(v.viewCount), 0L), count(v))
			from PropertyView v where v.propertyId in :propertyIds""")
	PropertyViewTotals totalsFor(Collection<Long> propertyIds);

}
