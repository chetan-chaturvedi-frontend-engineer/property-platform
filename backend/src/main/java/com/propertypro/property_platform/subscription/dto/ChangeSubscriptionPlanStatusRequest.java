package com.propertypro.property_platform.subscription.dto;

import com.propertypro.property_platform.subscription.domain.SubscriptionPlanStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangeSubscriptionPlanStatusRequest(
		@NotBlank @Pattern(regexp = SubscriptionPlanStatus.VALUES, message = "must be draft, active or inactive")
		String status) {
}
