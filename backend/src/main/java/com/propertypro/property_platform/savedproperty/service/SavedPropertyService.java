package com.propertypro.property_platform.savedproperty.service;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.property.dto.PublicPropertySummaryResponse;
import com.propertypro.property_platform.property.service.PublicPropertyService;
import com.propertypro.property_platform.savedproperty.domain.SavedProperty;
import com.propertypro.property_platform.savedproperty.exception.SavedPropertyExceptions;
import com.propertypro.property_platform.savedproperty.repository.SavedPropertyRepository;
import com.propertypro.property_platform.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

import static com.propertypro.property_platform.security.Permissions.SAVED_PROPERTY_CREATE;
import static com.propertypro.property_platform.security.Permissions.SAVED_PROPERTY_DELETE;
import static com.propertypro.property_platform.security.Permissions.SAVED_PROPERTY_LIST;

/**
 * The caller's shortlist of published properties. Every query is by the caller's id from the token, so nobody
 * can read or change another user's list.
 */
@Service
@RequiredArgsConstructor
public class SavedPropertyService {

	/** Upper bound of {@link #ids}: far beyond any real shortlist, so the response stays small. */
	static final int MAX_IDS = 500;

	private final SavedPropertyRepository repository;
	private final PublicPropertyService publicProperties;

	/** The shortlist as public property cards, newest first. Properties no longer public are skipped. */
	@Transactional(readOnly = true)
	public PageResponse<PublicPropertySummaryResponse> list(CurrentActor actor, Pageable pageable) {
		requirePermission(actor, SAVED_PROPERTY_LIST);
		Page<SavedProperty> page = repository.findByUserIdOrderByCreatedAtDescIdDesc(actor.userId(),
				PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
		List<PublicPropertySummaryResponse> cards = publicProperties
			.summariesByIds(page.getContent().stream().map(SavedProperty::getPropertyId).toList());
		return new PageResponse<>(cards, page.getNumber(), page.getSize(), page.getTotalElements(),
				page.getTotalPages());
	}

	@Transactional(readOnly = true)
	public List<Long> ids(CurrentActor actor) {
		requirePermission(actor, SAVED_PROPERTY_LIST);
		return repository.findPropertyIdsByUserId(actor.userId(), PageRequest.of(0, MAX_IDS));
	}

	/** Idempotent: saving a property twice keeps one row. 404 unless the property is published. */
	@Transactional
	public void save(CurrentActor actor, Long propertyId) {
		requirePermission(actor, SAVED_PROPERTY_CREATE);
		publicProperties.requirePublished(propertyId);
		if (repository.existsByUserIdAndPropertyId(actor.userId(), propertyId)) {
			return;
		}
		try {
			repository.saveAndFlush(new SavedProperty(actor.userId(), propertyId));
		}
		catch (DataIntegrityViolationException ex) {
			// A parallel request saved it first: the end state is the same.
		}
	}

	/** Idempotent: removing a property that is not saved succeeds. */
	@Transactional
	public void remove(CurrentActor actor, Long propertyId) {
		requirePermission(actor, SAVED_PROPERTY_DELETE);
		repository.deleteByUserIdAndPropertyId(actor.userId(), propertyId);
	}

	/** How many users saved these properties, for the owner's engagement numbers. */
	@Transactional(readOnly = true)
	public long countSaves(Collection<Long> propertyIds) {
		return propertyIds.isEmpty() ? 0 : repository.countByPropertyIdIn(propertyIds);
	}

	private static void requirePermission(CurrentActor actor, String permission) {
		if (!actor.has(permission)) {
			throw SavedPropertyExceptions.actionForbidden();
		}
	}

}
