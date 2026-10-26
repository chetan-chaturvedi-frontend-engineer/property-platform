package com.propertypro.property_platform.auth.validation;

/** Request carrying a new password and its confirmation; see {@link PasswordsMatch}. */
public interface PasswordConfirmation {

	String password();

	String passwordConfirmation();

}
