package com.propertypro.property_platform.propertyview.service;

import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.property.service.PublicPropertyService;
import com.propertypro.property_platform.propertyview.dto.PropertyViewTotals;
import com.propertypro.property_platform.propertyview.exception.PropertyViewExceptions;
import com.propertypro.property_platform.propertyview.repository.PropertyViewRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

import static com.propertypro.property_platform.security.Permissions.RECENTLY_VIEWED_CREATE;
import static com.propertypro.property_platform.security.Permissions.RECENTLY_VIEWED_DELETE;
import static com.propertypro.property_platform.security.Permissions.RECENTLY_VIEWED_LIST;

/**
 * Which published properties the caller opened, for "Recently viewed" and the owners' view counts. Every query is
 * by the caller's id from the token.
 */
@Service
@RequiredArgsConstructor
public class PropertyViewService {

	/** How many recently viewed properties are returned. */
	static final int RECENT_LIMIT = 50;

	private final PropertyViewRepository repository;
	private final PublicPropertyService publicProperties;

	/** Counts one view. 404 unless the property is published, so views never reveal unpublished properties. */
	@Transactional
	public void record(CurrentActor actor, Long propertyId) {
		requirePermission(actor, RECENTLY_VIEWED_CREATE);
		publicProperties.requirePublished(propertyId);
		repository.recordView(actor.userId(), propertyId);
	}

	/** Recently viewed public properties, most recent first. Properties no longer public are skipped. */
	@Transactional(readOnly = true)
	public List<PublicPropertySummaryResponse> recent(CurrentActor actor) {
		requirePermission(actor, RECENTLY_VIEWED_LIST);
		return publicProperties
			.summariesByIds(repository.findPropertyIdsByUserId(actor.userId(), PageRequest.of(0, RECENT_LIMIT)));
	}

	/** Forgets the caller's history. Counts owners already saw stay, since they are views of the property. */
	@Transactional
	public void clear(CurrentActor actor) {
		requirePermission(actor, RECENTLY_VIEWED_DELETE);
		repository.deleteByUserId(actor.userId());
	}

	/** View totals over the given properties, for the owner's engagement numbers. */
	@Transactional(readOnly = true)
	public PropertyViewTotals totals(Collection<Long> propertyIds) {
		return propertyIds.isEmpty() ? new PropertyViewTotals(0, 0) : repository.totalsFor(propertyIds);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw PropertyViewExceptions.actionForbidden();
		}
	}

}
