package com.propertypro.property_platform.subscription.api;

import com.propertypro.property_platform.subscription.dto.PublicSubscriptionPlanResponse;
import com.propertypro.property_platform.subscription.service.UserSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Active subscription plans for the mobile app and website; no login. */
@RestController
@RequestMapping(path = "/api/v1/public/subscription-plans", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Subscription plans", description = "Public plan list")
@RequiredArgsConstructor
public class PublicSubscriptionPlanController {

	private final UserSubscriptionService userSubscriptionService;

	@Operation(summary = "Active plans", description = """
			Active plans only, by sortOrder then id. A short fixed list from the plan catalog, so a plain array, \
			not paginated.""")
	@GetMapping
	public List<PublicSubscriptionPlanResponse> list() {
		return userSubscriptionService.activePlans();
	}

}
