package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.common.persistence.PersistableEnum;
import com.propertypro.property_platform.property.domain.PropertyStatusChange;
import com.propertypro.property_platform.property.domain.StatusChangeAction;
import com.propertypro.property_platform.property.repository.PropertyStatusChangeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records lifecycle events in the same transaction as the change, so the history (including rejection
 * reasons shown to owners) can never disagree with the property's status.
 */
@Service
@RequiredArgsConstructor
public class PropertyStatusHistoryService {

	private final PropertyStatusChangeRepository statusChangeRepository;

	@Transactional(propagation = Propagation.MANDATORY)
	public void record(Long propertyId, Long actorUserId, StatusChangeAction action, PersistableEnum from,
			PersistableEnum to, String reason) {
		statusChangeRepository.save(new PropertyStatusChange(propertyId, actorUserId, action,
				from == null ? null : from.getValue(), to == null ? null : to.getValue(), reason));
	}

}
