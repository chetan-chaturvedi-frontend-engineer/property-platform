package com.propertypro.property_platform.activitylog.service;

import com.propertypro.property_platform.activitylog.domain.SystemLog;
import com.propertypro.property_platform.activitylog.domain.SystemLogLevel;
import com.propertypro.property_platform.activitylog.dto.CreateSystemLogRequest;
import com.propertypro.property_platform.activitylog.dto.SystemLogFilter;
import com.propertypro.property_platform.activitylog.dto.SystemLogResponse;
import com.propertypro.property_platform.activitylog.exception.SystemLogExceptions;
import com.propertypro.property_platform.activitylog.repository.SystemLogRepository;
import com.propertypro.property_platform.common.exception.FieldValidationException;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.user.dto.UserAuditProfile;
import com.propertypro.property_platform.user.service.UserAccountService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The admin system log API; permissions are checked by the controller. Module code logs through
 * {@link SystemLogService} instead. Unlike those background writes, {@link #create} stores the row
 * before responding, so the caller gets its id or an error.
 */
@Service
@RequiredArgsConstructor
public class SystemLogAdminService {

	private static final List<String> SORTABLE = List.of("createdAt", "id");
	/** Headings that say nothing about what happened; compared lowercase. */
	private static final Set<String> GENERIC_ACTIONS = Set.of("action performed", "something happened");
	private static final Pattern WARNING_WORDS = Pattern.compile(
			"\\b(fail|fails|failed|failure|denied|unauthori[sz]ed|forbidden|suspicious|blocked|rejected|invalid)\\b",
			Pattern.CASE_INSENSITIVE);
	private static final Pattern SUCCESS_WORDS = Pattern.compile(
			"\\b(success|successful|successfully|created|added|updated|changed|deleted|removed|completed)\\b",
			Pattern.CASE_INSENSITIVE);
	/** Rejected at any depth of additional data; compared lowercase, without separators. */
	private static final List<String> SECRET_KEYS = List.of("password", "passwd", "secret", "token", "otp", "apikey",
			"authorization", "credential", "cookie");

	private final SystemLogRepository repository;
	private final SystemLogService systemLogService;
	private final UserAccountService userAccountService;

	@Transactional(readOnly = true)
	public PageResponse<SystemLogResponse> list(SystemLogFilter filter, Pageable pageable) {
		Page<SystemLog> page = repository.findAll(matching(filter), paging(pageable));
		Map<Long, UserAuditProfile> users = users(page.getContent());
		return PageResponse.of(page, log -> response(log, users));
	}

	@Transactional(readOnly = true)
	public SystemLogResponse get(Long id) {
		SystemLog log = repository.findById(id).orElseThrow(SystemLogExceptions::notFound);
		return response(log, users(List.of(log)));
	}

	@Transactional
	public SystemLogResponse create(CreateSystemLogRequest request) {
		String action = request.action().strip();
		if (GENERIC_ACTIONS.contains(action.toLowerCase(Locale.ROOT))) {
			throw new FieldValidationException("action", "must describe the activity");
		}
		if (request.referenceId() != null && request.referenceType() == null) {
			throw new FieldValidationException("referenceType", "is required with referenceId");
		}
		rejectUnsafe("additionalData", request.additionalData());
		SystemLogEntry entry = new SystemLogEntry(
				request.module() != null ? request.module() : SystemLogModules.SYSTEM, action,
				request.logLevel() != null ? SystemLogLevel.fromValue(request.logLevel()) : levelOf(action),
				null, request.referenceType(), request.referenceId(), request.additionalData());
		SystemLog log = repository.save(systemLogService.toLog(entry));
		return response(log, users(List.of(log)));
	}

	/** Immutable maps throw on a null key, and guest and system logs have no user id. */
	private static SystemLogResponse response(SystemLog log, Map<Long, UserAuditProfile> users) {
		return SystemLogResponse.of(log, log.getUserId() == null ? null : users.get(log.getUserId()));
	}

	private Map<Long, UserAuditProfile> users(List<SystemLog> logs) {
		List<Long> ids = logs.stream().map(SystemLog::getUserId).filter(Objects::nonNull).distinct().toList();
		return ids.isEmpty() ? Map.of() : userAccountService.findAuditProfiles(ids);
	}

	private static SystemLogLevel levelOf(String action) {
		if (WARNING_WORDS.matcher(action).find()) {
			return SystemLogLevel.WARNING;
		}
		return SUCCESS_WORDS.matcher(action).find() ? SystemLogLevel.SUCCESS : SystemLogLevel.INFO;
	}

	/** Values cannot be told apart from harmless text, but credential keys and NULs (invalid in jsonb) can. */
	private static void rejectUnsafe(String path, Object value) {
		if (value instanceof Map<?, ?> map) {
			map.forEach((key, nested) -> {
				String name = String.valueOf(key);
				String normalized = name.toLowerCase(Locale.ROOT).replaceAll("[_\\-. ]", "");
				if (name.indexOf('\0') >= 0 || SECRET_KEYS.stream().anyMatch(normalized::contains)) {
					throw new FieldValidationException(path, "must not contain credentials");
				}
				rejectUnsafe(path, nested);
			});
		}
		else if (value instanceof List<?> list) {
			list.forEach(nested -> rejectUnsafe(path, nested));
		}
		else if (value instanceof String text && text.indexOf('\0') >= 0) {
			throw new FieldValidationException(path, "must not contain control characters");
		}
	}

	private static PageRequest paging(Pageable pageable) {
		for (Sort.Order order : pageable.getSort()) {
			if (!SORTABLE.contains(order.getProperty())) {
				throw new FieldValidationException("sort", "must be one of " + String.join(", ", SORTABLE));
			}
		}
		// Unique tiebreaker, so rows with equal timestamps never repeat or go missing across pages.
		return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
				pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
	}

	private static Specification<SystemLog> matching(SystemLogFilter filter) {
		Instant from = filter.createdFrom();
		Instant to = filter.createdTo();
		if (from != null && to != null && from.isAfter(to)) {
			throw new FieldValidationException("createdTo", "must not be before the start of the range");
		}
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (filter.userId() != null) {
				predicates.add(cb.equal(root.get("userId"), filter.userId()));
			}
			if (filter.module() != null) {
				predicates.add(cb.equal(root.get("module"), filter.module()));
			}
			if (filter.logLevel() != null) {
				predicates.add(cb.equal(root.get("logLevel"), SystemLogLevel.fromValue(filter.logLevel())));
			}
			if (filter.ipAddress() != null) {
				predicates.add(cb.equal(root.get("ipAddress"), filter.ipAddress()));
			}
			if (filter.action() != null && !filter.action().isBlank()) {
				String pattern = "%" + escapeLike(filter.action().strip().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(cb.like(cb.lower(root.get("action")), pattern, '\\'));
			}
			if (filter.referenceId() != null) {
				predicates.add(cb.equal(root.get("referenceId"), filter.referenceId()));
			}
			if (from != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
			}
			if (to != null) {
				predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

	private static String escapeLike(String value) {
		return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
	}

}
