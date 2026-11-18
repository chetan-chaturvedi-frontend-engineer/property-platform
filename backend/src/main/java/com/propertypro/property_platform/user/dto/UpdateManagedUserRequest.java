package com.propertypro.property_platform.user.dto;

import com.propertypro.property_platform.common.validation.ValidPhone;
import com.propertypro.property_platform.common.web.RejectUnknownFields;
import com.propertypro.property_platform.role.domain.Role;
import com.propertypro.property_platform.user.domain.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Optional;

/**
 * Partial update (PATCH): omitted fields keep their value; explicit {@code null} clears {@code phone} and is
 * rejected for the others. Changing {@code status} also needs {@code USER_CHANGE_STATUS}. Passwords,
 * verification flags and documents are not editable here, so they are unknown fields (400).
 * <p>
 * A class rather than a record: Jackson calls a setter only for properties present in the JSON.
 */
@Getter
@Setter
@RejectUnknownFields
public class UpdateManagedUserRequest {

	private Optional<@NotBlank @Size(min = 2, max = 150) String> fullName;

	private Optional<@NotBlank @Email @Size(max = 255) String> email;

	private Optional<@ValidPhone String> phone;

	private Optional<@NotBlank @Size(max = Role.SLUG_MAX_LENGTH)
			@Pattern(regexp = Role.SLUG_PATTERN, message = "must be a role slug") String> userType;

	private Optional<@NotNull @Pattern(regexp = UserStatus.VALUES, message = "must be a user status") String> status;

}
