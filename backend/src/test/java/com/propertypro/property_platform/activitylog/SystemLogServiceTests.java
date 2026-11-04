package com.propertypro.property_platform.activitylog;

import com.propertypro.property_platform.activitylog.domain.SystemLog;
import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import com.propertypro.property_platform.activitylog.event.SystemLogRecordedEvent;
import com.propertypro.property_platform.activitylog.service.SystemLogEntry;
import com.propertypro.property_platform.activitylog.service.SystemLogService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class SystemLogServiceTests {

	private static final Instant NOW = Instant.parse("2026-11-04T10:00:00Z");

	private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
	private final SystemLogService service = new SystemLogService(events, Clock.fixed(NOW, ZoneOffset.UTC));

	@AfterEach
	void clearRequest() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	void aFullQueueNeverReachesTheCaller() {
		doThrow(new TaskRejectedException("queue full")).when(events).publishEvent(any(Object.class));

		assertThatCode(() -> service.record(SystemLogEntry.info("faqs", "FAQ updated"))).doesNotThrowAnyException();
	}

	@Test
	void outsideARequestOnlyTheEntryIsStored() {
		service.record(SystemLogEntry.info("authentication", "Cleanup"));

		SystemLog log = recorded();
		assertThat(log.getUserId()).isNull();
		assertThat(log.getIpAddress()).isNull();
		assertThat(log.getRequestUrl()).isNull();
		assertThat(log.getLogLevel()).isEqualTo(SystemLogLevel.INFO);
		assertThat(log.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void cleansClientControlledRequestValues() {
		MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/v1/faqs");
		request.setRemoteAddr("fe80::1%en0");
		request.setQueryString("token=secret");
		request.addHeader("User-Agent", "agent\u0000" + "x".repeat(600));
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		service.record(SystemLogEntry.warning("faqs", "a".repeat(300)));

		SystemLog log = recorded();
		assertThat(log.getIpAddress()).isEqualTo("fe80::1");
		assertThat(log.getUserAgent()).hasSize(512).doesNotContain("\u0000");
		assertThat(log.getRequestMethod()).isNull();
		assertThat(log.getRequestUrl()).isEqualTo("/api/v1/faqs");
		assertThat(log.getAction()).hasSize(255);
	}

	@Test
	void anAddressThatIsNotAnIpIsDroppedKeepingTheLog() {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/faqs");
		request.setRemoteAddr("unknown");
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

		service.record(SystemLogEntry.info("faqs", "Viewed"));

		assertThat(recorded().getIpAddress()).isNull();
	}

	private SystemLog recorded() {
		ArgumentCaptor<SystemLogRecordedEvent> event = ArgumentCaptor.forClass(SystemLogRecordedEvent.class);
		verify(events).publishEvent(event.capture());
		return event.getValue().log();
	}

}
