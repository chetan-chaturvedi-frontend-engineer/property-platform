package com.propertypro.property_platform.activitylog.service;

import com.propertypro.property_platform.activitylog.domain.SystemLog;
import com.propertypro.property_platform.activitylog.event.SystemLogRecordedEvent;
import com.propertypro.property_platform.common.web.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The one way to write a system log, callable from any module. Never throws: a logging failure must
 * not fail the caller. The row is stored on a background thread after the caller's transaction
 * commits, so logs of rolled-back work disappear with it; record failures outside the transaction.
 * Outside a request (scheduled jobs) the request columns and user stay NULL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemLogService {

	private static final Set<String> LOGGED_METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE");
	private static final Pattern IP_LITERAL = Pattern.compile("[0-9a-fA-F:.]{2,45}");
	private static final int MAX_ACTION = 255;
	private static final int MAX_USER_AGENT = 512;
	private static final int MAX_URL = 2048;

	private final ApplicationEventPublisher events;
	private final Clock clock;

	public void record(SystemLogEntry entry) {
		try {
			events.publishEvent(new SystemLogRecordedEvent(toLog(entry)));
		}
		catch (RuntimeException ex) {
			log.warn("System log dropped", ex);
		}
	}

	/** The row for this entry, with the request details and user filled in. */
	SystemLog toLog(SystemLogEntry entry) {
		SystemLog.SystemLogBuilder builder = SystemLog.builder()
			.userId(entry.userId() != null ? entry.userId() : authenticatedUserId())
			.module(entry.module())
			.action(truncate(entry.action(), MAX_ACTION))
			.logLevel(entry.level())
			.referenceType(entry.referenceType())
			.referenceId(entry.referenceId())
			.additionalData(entry.additionalData())
			.createdAt(clock.instant());
		if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
			HttpServletRequest request = attributes.getRequest();
			builder.ipAddress(ipAddress(request))
				.userAgent(userAgent(request))
				.requestMethod(LOGGED_METHODS.contains(request.getMethod()) ? request.getMethod() : null)
				.requestUrl(truncate(request.getRequestURI(), MAX_URL));
		}
		return builder.build();
	}

	private static Long authenticatedUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication != null && authentication.getPrincipal() instanceof Jwt jwt
				? Long.valueOf(jwt.getSubject())
				: null;
	}

	/** {@code inet} rejects IPv6 zone ids, and one bad value must not lose the whole row. */
	private static String ipAddress(HttpServletRequest request) {
		String address = ClientIp.of(request);
		if (address == null) {
			return null;
		}
		int zone = address.indexOf('%');
		String ip = zone < 0 ? address : address.substring(0, zone);
		return IP_LITERAL.matcher(ip).matches() ? ip : null;
	}

	/** Client-controlled, and PostgreSQL text cannot hold a NUL. */
	private static String userAgent(HttpServletRequest request) {
		String userAgent = request.getHeader("User-Agent");
		return userAgent == null ? null : truncate(userAgent.replaceAll("\\p{Cntrl}", ""), MAX_USER_AGENT);
	}

	private static String truncate(String value, int max) {
		return value == null || value.length() <= max ? value : value.substring(0, max);
	}

}
