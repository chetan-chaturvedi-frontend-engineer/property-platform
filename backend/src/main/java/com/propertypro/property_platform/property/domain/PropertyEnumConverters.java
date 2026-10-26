package com.propertypro.property_platform.property.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class PropertyEnumConverters {

	private PropertyEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class PropertyTypeConverter extends PersistableEnumConverter<PropertyType> {

		public PropertyTypeConverter() {
			super(PropertyType.class);
		}

	}

	@Converter(autoApply = true)
	public static class ProjectStatusConverter extends PersistableEnumConverter<ProjectStatus> {

		public ProjectStatusConverter() {
			super(ProjectStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class LegalApprovalStatusConverter extends PersistableEnumConverter<LegalApprovalStatus> {

		public LegalApprovalStatusConverter() {
			super(LegalApprovalStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class PublicationStatusConverter extends PersistableEnumConverter<PublicationStatus> {

		public PublicationStatusConverter() {
			super(PublicationStatus.class);
		}

	}

	@Converter(autoApply = true)
	public static class AreaUnitConverter extends PersistableEnumConverter<AreaUnit> {

		public AreaUnitConverter() {
			super(AreaUnit.class);
		}

	}

	@Converter(autoApply = true)
	public static class ApartmentTypeConverter extends PersistableEnumConverter<ApartmentType> {

		public ApartmentTypeConverter() {
			super(ApartmentType.class);
		}

	}

	@Converter(autoApply = true)
	public static class ProjectMediaTypeConverter extends PersistableEnumConverter<ProjectMediaType> {

		public ProjectMediaTypeConverter() {
			super(ProjectMediaType.class);
		}

	}

	@Converter(autoApply = true)
	public static class ApartmentMediaTypeConverter extends PersistableEnumConverter<ApartmentMediaType> {

		public ApartmentMediaTypeConverter() {
			super(ApartmentMediaType.class);
		}

	}

	@Converter(autoApply = true)
	public static class NearbyPlaceTypeConverter extends PersistableEnumConverter<NearbyPlaceType> {

		public NearbyPlaceTypeConverter() {
			super(NearbyPlaceType.class);
		}

	}

	@Converter(autoApply = true)
	public static class DistanceSourceConverter extends PersistableEnumConverter<DistanceSource> {

		public DistanceSourceConverter() {
			super(DistanceSource.class);
		}

	}

	@Converter(autoApply = true)
	public static class StatusChangeActionConverter extends PersistableEnumConverter<StatusChangeAction> {

		public StatusChangeActionConverter() {
			super(StatusChangeAction.class);
		}

	}

}
