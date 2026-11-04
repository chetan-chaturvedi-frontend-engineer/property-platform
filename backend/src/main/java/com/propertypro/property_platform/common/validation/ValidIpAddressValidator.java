package com.propertypro.property_platform.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Pattern;

public class ValidIpAddressValidator implements ConstraintValidator<ValidIpAddress, String> {

	private static final String OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
	private static final Pattern IPV4 = Pattern.compile(OCTET + "(\\." + OCTET + "){3}");
	private static final Pattern IPV6_CHARACTERS = Pattern.compile("[0-9a-fA-F:.]{2,45}");

	@Override
	public boolean isValid(String value, ConstraintValidatorContext context) {
		if (value == null || IPV4.matcher(value).matches()) {
			return true;
		}
		// With a colon InetAddress only parses the literal; it never reaches DNS.
		return value.indexOf(':') >= 0 && IPV6_CHARACTERS.matcher(value).matches() && parses(value);
	}

	private static boolean parses(String value) {
		try {
			InetAddress.getByName(value);
			return true;
		}
		catch (UnknownHostException ex) {
			return false;
		}
	}

}
