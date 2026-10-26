package com.propertypro.property_platform.otp.service;

import com.propertypro.property_platform.otp.config.OtpProperties;
import com.propertypro.property_platform.otp.domain.OtpPurpose;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * Generates codes and hashes them with HMAC-SHA256. The purpose and destination are part of the
 * hashed input, so a code only matches the challenge it was issued for.
 */
@Component
public class OtpHasher {

	private static final String ALGORITHM = "HmacSHA256";

	private final SecureRandom random = new SecureRandom();
	private final SecretKeySpec key;
	private final int length;
	private final int bound;

	public OtpHasher(OtpProperties properties) {
		this.key = new SecretKeySpec(properties.hmacSecret().getBytes(StandardCharsets.UTF_8), ALGORITHM);
		this.length = properties.length();
		this.bound = (int) Math.pow(10, length);
	}

	public String generateCode() {
		return String.format("%0" + length + "d", random.nextInt(bound));
	}

	public String hash(OtpPurpose purpose, String destination, String code) {
		try {
			Mac mac = Mac.getInstance(ALGORITHM);
			mac.init(key);
			byte[] digest = mac.doFinal((purpose.getValue() + '\n' + destination + '\n' + code)
					.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException("HMAC-SHA256 unavailable", ex);
		}
	}

	public boolean matches(String expectedHash, OtpPurpose purpose, String destination, String code) {
		byte[] expected = expectedHash.getBytes(StandardCharsets.US_ASCII);
		byte[] actual = hash(purpose, destination, code).getBytes(StandardCharsets.US_ASCII);
		return MessageDigest.isEqual(expected, actual);
	}

}
