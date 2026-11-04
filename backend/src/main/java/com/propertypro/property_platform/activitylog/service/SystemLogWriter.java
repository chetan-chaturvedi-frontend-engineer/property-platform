package com.propertypro.property_platform.activitylog.service;

import com.propertypro.property_platform.activitylog.event.SystemLogRecordedEvent;
import com.propertypro.property_platform.activitylog.repository.SystemLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Stores logs off the request path. {@code fallbackExecution} covers callers without a transaction. */
@Slf4j
@Component
@RequiredArgsConstructor
public class SystemLogWriter {

	private final SystemLogRepository repository;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
	public void onRecorded(SystemLogRecordedEvent event) {
		try {
			repository.save(event.log());
		}
		catch (RuntimeException ex) {
			log.warn("System log not stored module={} action={}: {}", event.log().getModule(), event.log().getAction(),
					ex.getMessage());
		}
	}

}
