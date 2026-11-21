package com.propertypro.property_platform.subscription.repository;

import com.propertypro.property_platform.subscription.domain.SubscriptionPlan;
import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface SubscriptionPlanRepository
		extends JpaRepository<SubscriptionPlan, Long>, JpaSpecificationExecutor<SubscriptionPlan> {

	/** The public plan list: active plans in display order. */
	List<SubscriptionPlan> findByStatusOrderBySortOrderAscIdAsc(SubscriptionPlanStatus status);

	boolean existsBySlug(String slug);

	boolean existsBySlugAndIdNot(String slug, Long id);

}
