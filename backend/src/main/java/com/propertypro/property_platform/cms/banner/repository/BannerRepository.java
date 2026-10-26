package com.propertypro.property_platform.cms.banner.repository;

import com.propertypro.property_platform.cms.banner.domain.Banner;
import com.propertypro.property_platform.cms.banner.domain.BannerStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long>, JpaSpecificationExecutor<Banner> {

	/** Stable display order; banners have no priority column. */
	Sort DISPLAY_ORDER = Sort.by(Sort.Order.asc("placement"), Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

	/**
	 * Banners eligible for display at {@code now}, same rule as {@link Banner#isDisplayableAt(Instant)},
	 * in {@link #DISPLAY_ORDER} (the pageable's sort is ignored). {@code placement} null = all.
	 * Soft-deleted rows are excluded by {@code @SoftDelete}; served by {@code idx_banners_displayable}.
	 */
	default Page<Banner> findDisplayable(String placement, Instant now, Pageable pageable) {
		Specification<Banner> displayable = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("status"), BannerStatus.ACTIVE));
			if (placement != null) {
				predicates.add(cb.equal(root.get("placement"), placement));
			}
			predicates.add(cb.or(cb.isNull(root.get("startDate")),
					cb.lessThanOrEqualTo(root.<Instant>get("startDate"), now)));
			predicates.add(cb.or(cb.isNull(root.get("endDate")),
					cb.greaterThanOrEqualTo(root.<Instant>get("endDate"), now)));
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		return findAll(displayable, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), DISPLAY_ORDER));
	}

	/** Rows using the storage key, soft-deleted ones included (they keep their image). */
	@Query(value = "SELECT count(*) FROM banners WHERE image = :image", nativeQuery = true)
	long countAllByImageIncludingDeleted(@Param("image") String image);

}
