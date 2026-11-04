package com.propertypro.property_platform.lead.api;

import com.propertypro.property_platform.activitylog.web.SystemLogged;
import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.lead.dto.LeadFilter;
import com.propertypro.property_platform.lead.dto.LeadSummaryResponse;
import com.propertypro.property_platform.lead.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin dashboard: every lead. {@code ADMIN_PANEL_ACCESS} is required for the whole path by
 * {@code SecurityConfig}. Details, edits, assignment, schedules and interactions use
 * {@code /api/v1/leads/{id}/...} with the {@code _ANY} and lead permissions.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/leads", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Tag(name = "Admin leads", description = "All leads")
@RequiredArgsConstructor
public class AdminLeadController {

	private final LeadService leadService;

	@Operation(summary = "List all leads", description = "Same filters and sorting as GET /api/v1/leads.")
	@GetMapping
	@SystemLogged(action = "Viewed all leads")
	@PreAuthorize("hasAuthority('LEAD_LIST_ANY')")
	public PageResponse<LeadSummaryResponse> list(@Valid LeadFilter filter,
			@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return leadService.listAll(filter, pageable);
	}

}
