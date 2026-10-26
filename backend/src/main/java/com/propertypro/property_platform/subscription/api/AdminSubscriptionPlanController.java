package com.propertypro.property_platform.subscription.api;

import com.propertypro.property_platform.common.web.PageResponse;
import com.propertypro.property_platform.config.OpenApiConfig;
import com.propertypro.property_platform.subscription.dto.ChangeSubscriptionPlanStatusRequest;
import com.propertypro.property_platform.subscription.dto.CreateSubscriptionPlanRequest;
import com.propertypro.property_platform.subscription.dto.SubscriptionPlanFilter;
import com.propertypro.property_platform.subscription.dto.SubscriptionPlanResponse;
import com.propertypro.property_platform.subscription.dto.UpdateSubscriptionPlanRequest;
import com.propertypro.property_platform.subscription.service.SubscriptionPlanService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Plan catalog for the admin dashboard: every plan in every status. {@code ADMIN_PANEL_ACCESS} is
 * required for the whole path by {@code SecurityConfig}; each endpoint adds its own permission.
 */
@RestController
@RequestMapping(path = "/api/v1/admin/subscription-plans", produces = MediaType.APPLICATION_JSON_VALUE)
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@RequiredArgsConstructor
public class AdminSubscriptionPlanController {

	private final SubscriptionPlanService planService;

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('SUBSCRIPTION_PLAN_CREATE')")
	public SubscriptionPlanResponse create(@Valid @RequestBody CreateSubscriptionPlanRequest request) {
		return planService.create(request);
	}

	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SUBSCRIPTION_PLAN_UPDATE')")
	public SubscriptionPlanResponse update(@PathVariable Long id,
			@Valid @RequestBody UpdateSubscriptionPlanRequest request) {
		return planService.update(id, request);
	}

	@PatchMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
	@PreAuthorize("hasAuthority('SUBSCRIPTION_PLAN_CHANGE_STATUS')")
	public SubscriptionPlanResponse changeStatus(@PathVariable Long id,
			@Valid @RequestBody ChangeSubscriptionPlanStatusRequest request) {
		return planService.changeStatus(id, request);
	}

	@GetMapping("/{id}")
	@PreAuthorize("hasAuthority('SUBSCRIPTION_PLAN_VIEW')")
	public SubscriptionPlanResponse get(@PathVariable Long id) {
		return planService.get(id);
	}

	/** {@code page} (zero-based), {@code size} (max 100) and {@code sort}, plus the filter parameters. */
	@GetMapping
	@PreAuthorize("hasAuthority('SUBSCRIPTION_PLAN_LIST')")
	public PageResponse<SubscriptionPlanResponse> list(@Valid SubscriptionPlanFilter filter,
			@SortDefault.SortDefaults({ @SortDefault(sort = "sortOrder", direction = Sort.Direction.ASC),
					@SortDefault(sort = "createdAt", direction = Sort.Direction.DESC) }) Pageable pageable) {
		return planService.list(filter, pageable);
	}

}
