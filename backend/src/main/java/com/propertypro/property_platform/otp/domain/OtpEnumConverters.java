package com.propertypro.property_platform.otp.domain;

import com.propertypro.property_platform.common.persistence.PersistableEnumConverter;
import jakarta.persistence.Converter;

public final class OtpEnumConverters {

	private OtpEnumConverters() {
	}

	@Converter(autoApply = true)
	public static class PurposeConverter extends PersistableEnumConverter<OtpPurpose> {

		public PurposeConverter() {
			super(OtpPurpose.class);
		}

	}

	@Converter(autoApply = true)
	public static class ChannelConverter extends PersistableEnumConverter<OtpChannel> {

		public ChannelConverter() {
			super(OtpChannel.class);
		}

	}

	@Converter(autoApply = true)
	public static class DeliveryStatusConverter extends PersistableEnumConverter<OtpDeliveryStatus> {

		public DeliveryStatusConverter() {
			super(OtpDeliveryStatus.class);
		}

	}

}
