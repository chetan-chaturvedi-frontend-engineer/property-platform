package com.propertypro.property_platform.otp.event;

import com.propertypro.property_platform.otp.domain.OtpChannel;
import com.propertypro.property_platform.otp.domain.OtpPurpose;

/**
 * Published inside the issuing transaction and delivered after commit. Carries the plaintext code
 * in memory only; it is never persisted, and {@link #toString()} redacts it.
 */
public record OtpIssuedEvent(Long challengeId, OtpPurpose purpose, OtpChannel channel, String destination,
		String code) {

	@Override
	public String toString() {
		return "OtpIssuedEvent[challengeId=" + challengeId + ", purpose=" + purpose + ", channel=" + channel + "]";
	}

}
