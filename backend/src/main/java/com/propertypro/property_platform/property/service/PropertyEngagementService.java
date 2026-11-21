package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.dto.PropertyEngagementResponse;
import com.propertypro.property_platform.property.exception.PropertyExceptions;
import com.propertypro.property_platform.property.repository.PropertyProjectSummaryRepository;
import com.propertypro.property_platform.propertyview.dto.PropertyViewTotals;
import com.propertypro.property_platform.propertyview.service.PropertyViewService;
import com.propertypro.property_platform.savedproperty.service.SavedPropertyService;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

import static com.propertypro.property_platform.security.Permissions.PROPERTY_LIST;
import static com.propertypro.property_platform.security.Permissions.PROPERTY_VIEW;

/** Owner-only engagement numbers. Ownership is decided by the same lookup as the owner's property detail. */
@Service
@RequiredArgsConstructor
public class PropertyEngagementService {

	private final PropertyService propertyService;
	private final PropertyProjectSummaryRepository summaryRepository;
	private final PropertyViewService propertyViews;
	private final SavedPropertyService savedProperties;

	/** One property of the caller; 404 for anyone else's (never 403), like the property detail. */
	@Transactional(readOnly = true)
	public PropertyEngagementResponse forProperty(Long id, CurrentActor actor) {
		if (!actor.has(PROPERTY_VIEW)) {
			throw PropertyExceptions.actionForbidden();
		}
		propertyService.get(id, actor);
		return count(List.of(id));
	}

	/** All of the caller's own, non-deleted properties together. */
	@Transactional(readOnly = true)
	public PropertyEngagementResponse forOwner(CurrentActor actor) {
		if (!actor.has(PROPERTY_LIST)) {
			throw PropertyExceptions.actionForbidden();
		}
		return count(summaryRepository.findIdsByOwner(actor.userId()));
	}

	private PropertyEngagementResponse count(Collection<Long> propertyIds) {
		PropertyViewTotals views = propertyViews.totals(propertyIds);
		return new PropertyEngagementResponse(views.views(), views.uniqueViewers(), savedProperties.countSaves(propertyIds));
	}

}
