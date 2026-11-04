package com.propertypro.property_platform.activitylog.api;

import com.propertypro.property_platform.activitylog.dto.CreateSystemLogRequest;
import com.propertypro.property_platform.activitylog.dto.SystemLogFilter;
import com.propertypro.property_platform.activitylog.dto.SystemLogResponse;
import com.propertypro.property_platform.activitylog.service.SystemLogAdminService;
import com.propertypro.property_platform.activitylog.web.SystemLogged;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * System logs for the admin dashboard. {@code ADMIN_PANEL_ACCESS} is required for the whole path by
 * {@code SecurityConfig}; each endpoint adds its own permission, resolved from the user's role on
 * every request. Logs are append-only, so there is no update or delete.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/system-logs", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin system logs", description = "List, view and add system logs")
@RequiredArgsConstructor
public class AdminSystemLogController {

	private final SystemLogAdminService systemLogAdminService;

	@Operation(summary = "List system logs (SYSTEM_LOG_LIST)", description = """
			page (zero-based), size (1-100), sort by createdAt (default, newest first) or id. Filters: userId, \
			module, logLevel, ipAddress, action (keyword), referenceId, createdFrom, createdTo.""")
	@GetMapping
	@PreAuthorize("hasAuthority('SYSTEM_LOG_LIST')")
	public PageResponse<SystemLogResponse> list(@Valid SystemLogFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return systemLogAdminService.list(filter, pageable);
	}

	@Operation(summary = "System log details (SYSTEM_LOG_VIEW)")
	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('SYSTEM_LOG_VIEW')")
	public SystemLogResponse get(@PathVariable Long id) {
		return systemLogAdminService.get(id);
	}

	@Operation(summary = "Add a system log (SYSTEM_LOG_CREATE)", description = """
			JSON: action (required), module (system by default), logLevel (derived from the action by default), \
			referenceId, referenceType, additionalData. User, IP address, user agent, method, URL and time come from \
			the request; sending them is rejected.""")
	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@SystemLogged(logSuccess = false)
	@PreAuthorize("hasAuthority('SYSTEM_LOG_CREATE')")
	public SystemLogResponse create(@Valid @RequestBody CreateSystemLogRequest request) {
		return systemLogAdminService.create(request);
	}

}
