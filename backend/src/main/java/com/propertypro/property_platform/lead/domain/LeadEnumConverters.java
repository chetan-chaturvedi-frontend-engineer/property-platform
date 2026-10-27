package com.propertypro.property_platform.lead.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class LeadEnumConverters {

	private LeadEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class LeadSourceConverter extends PersistableEnumConverter<LeadSource> {

		public LeadSourceConverter() {
			super(LeadSource.class);
		}

	}

	@Converter(autoApply = true)
	public static class LeadStatusConverter extends PersistableEnumConverter<LeadStatus> {

		public LeadStatusConverter() {
			super(LeadStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class LeadPriorityConverter extends PersistableEnumConverter<LeadPriority> {

		public LeadPriorityConverter() {
			super(LeadPriority.class);
		}

	}

	@Converter(autoApply = true)
	public static class LeadPurposeConverter extends PersistableEnumConverter<LeadPurpose> {

		public LeadPurposeConverter() {
			super(LeadPurpose.class);
		}

	}

	@Converter(autoApply = true)
	public static class LeadPropertyTypeConverter extends PersistableEnumConverter<LeadPropertyType> {

		public LeadPropertyTypeConverter() {
			super(LeadPropertyType.class);
		}

	}

	@Converter(autoApply = true)
	public static class PossessionTimelineConverter extends PersistableEnumConverter<PossessionTimeline> {

		public PossessionTimelineConverter() {
			super(PossessionTimeline.class);
		}

	}

	@Converter(autoApply = true)
	public static class FacingConverter extends PersistableEnumConverter<Facing> {

		public FacingConverter() {
			super(Facing.class);
		}

	}

	@Converter(autoApply = true)
	public static class FurnishingConverter extends PersistableEnumConverter<Furnishing> {

		public FurnishingConverter() {
			super(Furnishing.class);
		}

	}

	@Converter(autoApply = true)
	public static class ParkingPreferenceConverter extends PersistableEnumConverter<ParkingPreference> {

		public ParkingPreferenceConverter() {
			super(ParkingPreference.class);
		}

	}

	@Converter(autoApply = true)
	public static class ScheduleTypeConverter extends PersistableEnumConverter<ScheduleType> {

		public ScheduleTypeConverter() {
			super(ScheduleType.class);
		}

	}

	@Converter(autoApply = true)
	public static class ScheduleStatusConverter extends PersistableEnumConverter<ScheduleStatus> {

		public ScheduleStatusConverter() {
			super(ScheduleStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class InteractionTypeConverter extends PersistableEnumConverter<InteractionType> {

		public InteractionTypeConverter() {
			super(InteractionType.class);
		}

	}

	@Converter(autoApply = true)
	public static class InteractionOutcomeConverter extends PersistableEnumConverter<InteractionOutcome> {

		public InteractionOutcomeConverter() {
			super(InteractionOutcome.class);
		}

	}

	@Converter(autoApply = true)
	public static class SiteVisitStatusConverter extends PersistableEnumConverter<SiteVisitStatus> {

		public SiteVisitStatusConverter() {
			super(SiteVisitStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class SiteVisitTypeConverter extends PersistableEnumConverter<SiteVisitType> {

		public SiteVisitTypeConverter() {
			super(SiteVisitType.class);
		}

	}

	@Converter(autoApply = true)
	public static class SiteVisitInterestConverter extends PersistableEnumConverter<SiteVisitInterest> {

		public SiteVisitInterestConverter() {
			super(SiteVisitInterest.class);
		}

	}

}
