package com.propertypro.property_platform.property.service;

import com.propertypro.property_platform.property.repository.PropertyProjectRepository;
import com.propertypro.property_platform.user.event.AccountDeletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Keeps the public property list free of listings whose owner deleted their account. */
@Slf4j
@Component
@RequiredArgsConstructor
public class PropertyAccountListener {

	private final PropertyProjectRepository repository;

	@EventListener
	@Transactional(propagation = Propagation.MANDATORY)
	public void onAccountDeleted(AccountDeletedEvent event) {
		int archived = repository.archiveAllOfOwner(event.userId());
		log.info("Properties archived after account deletion userId={} count={}", event.userId(), archived);
	}

}
