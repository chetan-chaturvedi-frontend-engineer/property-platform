package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.subscription.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single property-limit check. Every path that creates a property project (API, bulk, import,
 * job) must call it in the transaction that inserts the project; viewing, editing and deleting
 * projects are never limited.
 * <p>
 * Counted: the owner's projects that are not soft-deleted, in any publication status (drafts
 * count, so the limit cannot be bypassed with unpublished projects). Deleting one frees a slot.
 */
@Component
@RequiredArgsConstructor
public class PropertyLimitGuard {

	private final SubscriptionService subscriptionService;
	private final PropertyProjectRepository projectRepository;

	/** @param ownerId the authenticated user, never a client-supplied id */
	@Transactional(propagation = Propagation.MANDATORY)
	public void requireCapacityForNewProject(Long ownerId) {
		subscriptionService.requirePropertyCapacity(ownerId, () -> projectRepository.countByUserId(ownerId));
	}

}
