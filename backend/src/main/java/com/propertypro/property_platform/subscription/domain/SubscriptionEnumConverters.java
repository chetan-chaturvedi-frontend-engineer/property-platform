package com.propertypro.property_platform.subscription.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class SubscriptionEnumConverters {

	private SubscriptionEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class BillingIntervalConverter extends PersistableEnumConverter<BillingInterval> {

		public BillingIntervalConverter() {
			super(BillingInterval.class);
		}

	}

	@Converter(autoApply = true)
	public static class SubscriptionPlanStatusConverter extends PersistableEnumConverter<SubscriptionPlanStatus> {

		public SubscriptionPlanStatusConverter() {
			super(SubscriptionPlanStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class SubscriptionStatusConverter extends PersistableEnumConverter<SubscriptionStatus> {

		public SubscriptionStatusConverter() {
			super(SubscriptionStatus.class);
		}

	}

}
