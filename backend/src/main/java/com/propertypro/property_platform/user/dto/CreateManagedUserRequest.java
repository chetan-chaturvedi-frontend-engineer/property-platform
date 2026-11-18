package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.auth.validation.PasswordConfirmation;
import com.propertypro.property_platform.auth.validation.PasswordsMatch;
import com.propertypro.property_platform.auth.validation.StrongPassword;
import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.user.domain.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * New account created by an admin. Only these fields are accepted; anything else (id, verification flags,
 * documents, ...) is rejected.
 *
 * @param phone    optional; any format, stored as E.164
 * @param userType slug of an active role the caller may assign (see {@code AdminUserService})
 * @param status        defaults to pending; any other value also needs {@code USER_CHANGE_STATUS}
 * @param emailVerified true marks the email as verified so the account can sign in right away; only with
 *                      status {@code active}. Omitted or false: the user verifies through the OTP flow
 */
@PasswordsMatch
@RejectUnknownFields
public record CreateManagedUserRequest(
		@NotBlank @Size(min = 2, max = 150) String fullName,
		@NotBlank @Email @Size(max = 255) String email,
		@ValidPhone String phone,
		@NotBlank @StrongPassword String password,
		@NotBlank String passwordConfirmation,
		@NotBlank @Size(max = Role.SLUG_MAX_LENGTH)
		@Pattern(regexp = Role.SLUG_PATTERN, message = "must be a role slug") String userType,
		@Pattern(regexp = UserStatus.CREATABLE_VALUES, message = "must be pending, active or inactive") String status,
		Boolean emailVerified)
		implements PasswordConfirmation {
}
